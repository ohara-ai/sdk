import fs from 'fs/promises'
import path from 'path'
import { privateKeyToAccount } from 'viem/accounts'
import { Address } from 'viem'
import {
  OharaApiClient,
  getOharaApiClient,
  DeployedContract,
} from '../server/oharaApiClient'
import {
  encrypt,
  decrypt,
  isEncryptionEnabled,
  getEncryptionSecret,
} from './encryption'

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const CONTRACTS_PATH = path.join(STORAGE_DIR, 'contracts.json')
const KEYS_PATH = path.join(STORAGE_DIR, 'keys.json')
const API_CACHE_PATH = path.join(STORAGE_DIR, 'api-cache.json')

// Contract addresses organized by context
export interface OharaContracts {
  token?: string
}

export interface GameContracts {
  match?: string
  score?: string
}

export interface AppContracts {
  coin?: string
}

export interface ContractAddresses {
  ohara?: OharaContracts
  game?: GameContracts
  app?: AppContracts
}

interface ContractsStorage {
  [chainId: string]: ContractAddresses
}

// Cached contract from API
export interface CachedContract {
  contractType: string
  contractAddress: Address
  deploymentParams: Record<string, unknown>
  chainId: number
  createdAt: string
}

interface ApiCacheStorage {
  [chainId: string]: {
    [contractType: string]: CachedContract
  }
}

export interface KeyStorage {
  [key: string]: string
}

// Contracts accessors and storage

async function readContracts(): Promise<ContractsStorage> {
  await ensureStorageExists()

  try {
    const content = await fs.readFile(CONTRACTS_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading contract storage:', error)
    return {}
  }
}

export async function getContracts(
  chainId: number,
): Promise<ContractAddresses> {
  // If API client is configured, fetch from API
  const isApiMode = OharaApiClient.isConfigured()

  if (isApiMode) {
    try {
      const oharaApiClient = getOharaApiClient()
      const response = await oharaApiClient.getContracts()
      const contracts = response.data

      // Filter contracts by chainId and group by contractType
      const contractsByType: { [key: string]: DeployedContract[] } = {}

      for (const contract of contracts) {
        if (contract.chainId === chainId) {
          if (!contractsByType[contract.contractType]) {
            contractsByType[contract.contractType] = []
          }
          contractsByType[contract.contractType].push(contract)
        }
      }

      // Select the newest contract for each type
      const newestContracts: { [key: string]: DeployedContract } = {}

      for (const [contractType, contractsOfType] of Object.entries(
        contractsByType,
      )) {
        // Sort by createdAt descending (newest first)
        contractsOfType.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        newestContracts[contractType] = contractsOfType[0]
      }

      // Update cache with the newest contracts
      await updateApiCache(chainId, newestContracts)

      // Convert to ContractAddresses format
      return convertToContractAddresses(newestContracts)
    } catch (error) {
      console.error(
        'Failed to fetch contracts from API, falling back to cache:',
        error,
      )
      // Try to read from cache
      const cached = await readApiCache(chainId)
      if (cached) {
        return convertCacheToContractAddresses(cached)
      }
    }
  }

  // Fall back to local storage
  const storage = await readContracts()
  return storage[chainId.toString()] || {}
}

export async function updateContracts(
  chainId: number,
  addresses: Partial<ContractAddresses>,
): Promise<void> {
  const storage = await readContracts()
  const chainKey = chainId.toString()

  storage[chainKey] = {
    ...storage[chainKey],
    ...addresses,
  }

  await ensureStorageExists()

  try {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify(storage, null, 2))
  } catch (error) {
    console.error('Error writing contract storage:', error)
    throw error
  }
}

export async function setContractAddress(
  chainId: number,
  context: keyof ContractAddresses,
  contractType: string,
  address: string,
): Promise<void> {
  const storage = await readContracts()
  const chainKey = chainId.toString()

  if (!storage[chainKey]) {
    storage[chainKey] = {}
  }

  if (!storage[chainKey][context]) {
    storage[chainKey][context] = {}
  }

  // @ts-expect-error - dynamic property assignment
  storage[chainKey][context][contractType] = address

  await ensureStorageExists()

  try {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify(storage, null, 2))
  } catch (error) {
    console.error('Error writing contract address:', error)
    throw error
  }
}

// Keys accessors and storage

/**
 * Get the controller private key from storage
 * 
 * WARNING: This is a backend/dev utility. Controller keys should NEVER
 * be stored or accessed in browser environments.
 * 
 * For production deployments, use Ohara API mode instead of storing keys locally.
 * 
 * If OHARA_KEY_ENCRYPTION_SECRET is set, keys are encrypted at rest.
 * This provides defense-in-depth but does NOT make local key storage production-safe.
 * 
 * @throws {Error} If called in API mode (keys are managed by Ohara API)
 */
export async function getControllerKey(): Promise<string> {
  if (OharaApiClient.isConfigured()) {
    throw new Error('Controller key is not available in API mode')
  }
  const key = await getKey('controller')

  if (key) return key

  // Generate a new random private key if none exists
  const randomBytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes)
  } else {
    // Fallback for Node.js
    const nodeCrypto = await import('crypto')
    const randomBuffer = nodeCrypto.randomBytes(32)
    randomBytes.set(randomBuffer)
  }

  const newPrivateKey =
    '0x' +
    Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  await setKey('controller', newPrivateKey)

  return newPrivateKey
}

export async function getControllerAddress(): Promise<Address | undefined> {
  // If API client is provided, fetch controller address from Ohara API
  const isApiMode = OharaApiClient.isConfigured()
  let oharaApiClient: OharaApiClient | undefined

  if (isApiMode) {
    oharaApiClient = getOharaApiClient()
  }

  if (oharaApiClient) {
    try {
      const walletInfo = await oharaApiClient.getWallet()
      return walletInfo.data.address
    } catch (error) {
      console.error('Failed to fetch controller address from Ohara API:', error)
      return undefined
    }
  }

  // Otherwise, derive controller address from stored private key
  const privateKey = await getControllerKey()
  if (!privateKey) return undefined

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  if (!account) return undefined

  return account.address
}

async function readKeys(): Promise<KeyStorage> {
  await ensureStorageExists()

  try {
    const content = await fs.readFile(KEYS_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading keys storage:', error)
    return {}
  }
}

async function getKey(keyName: string): Promise<string | undefined> {
  const keys = await readKeys()
  const storedValue = keys[keyName]
  
  if (!storedValue) return undefined
  
  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const secret = getEncryptionSecret()
    if (!secret) return undefined
    
    try {
      return decrypt(storedValue, secret)
    } catch (error) {
      console.error('Error decrypting key:', error)
      throw new Error('Failed to decrypt key. Check OHARA_KEY_ENCRYPTION_SECRET.')
    }
  }
  
  return storedValue
}

async function setKey(keyName: string, value: string): Promise<void> {
  const keys = await readKeys()
  
  // Encrypt if encryption is enabled
  let valueToStore = value
  if (isEncryptionEnabled()) {
    const secret = getEncryptionSecret()
    if (!secret) {
      throw new Error('OHARA_KEY_ENCRYPTION_SECRET is required for encryption')
    }
    valueToStore = encrypt(value, secret)
  }
  
  keys[keyName] = valueToStore

  await ensureStorageExists()

  try {
    await fs.writeFile(KEYS_PATH, JSON.stringify(keys, null, 2))
  } catch (error) {
    console.error('Error writing keys storage:', error)
    throw error
  }
}

// API Cache functions

async function readApiCache(
  chainId: number,
): Promise<{ [contractType: string]: CachedContract } | null> {
  await ensureStorageExists()

  try {
    const content = await fs.readFile(API_CACHE_PATH, 'utf-8')
    const cache: ApiCacheStorage = JSON.parse(content)
    return cache[chainId.toString()] || null
  } catch {
    return null
  }
}

async function updateApiCache(
  chainId: number,
  contracts: { [key: string]: DeployedContract },
): Promise<void> {
  await ensureStorageExists()

  let cache: ApiCacheStorage = {}

  try {
    const content = await fs.readFile(API_CACHE_PATH, 'utf-8')
    cache = JSON.parse(content)
  } catch {
    // Cache file doesn't exist yet
  }

  const chainKey = chainId.toString()

  if (!cache[chainKey]) {
    cache[chainKey] = {}
  }

  // Store only necessary info
  for (const [contractType, contract] of Object.entries(contracts)) {
    cache[chainKey][contractType] = {
      contractType: contract.contractType,
      contractAddress: contract.contractAddress,
      deploymentParams: contract.deploymentParams,
      chainId: contract.chainId,
      createdAt: contract.createdAt,
    }
  }

  try {
    await fs.writeFile(API_CACHE_PATH, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('Error writing API cache:', error)
  }
}

function convertToContractAddresses(contracts: {
  [key: string]: DeployedContract
}): ContractAddresses {
  const result: ContractAddresses = {}

  for (const contract of Object.values(contracts)) {
    const contractType = contract.contractType.toLowerCase()

    // Map contract types to the appropriate context
    if (contractType === 'match') {
      if (!result.game) result.game = {}
      result.game.match = contract.contractAddress
    } else if (contractType === 'score') {
      if (!result.game) result.game = {}
      result.game.score = contract.contractAddress
    } else if (contractType === 'token') {
      if (!result.ohara) result.ohara = {}
      result.ohara.token = contract.contractAddress
    } else if (contractType === 'coin') {
      if (!result.app) result.app = {}
      result.app.coin = contract.contractAddress
    }
  }

  return result
}

function convertCacheToContractAddresses(cache: {
  [contractType: string]: CachedContract
}): ContractAddresses {
  const result: ContractAddresses = {}

  for (const contract of Object.values(cache)) {
    const contractType = contract.contractType.toLowerCase()

    // Map contract types to the appropriate context
    if (contractType === 'match') {
      if (!result.game) result.game = {}
      result.game.match = contract.contractAddress
    } else if (contractType === 'score') {
      if (!result.game) result.game = {}
      result.game.score = contract.contractAddress
    } else if (contractType === 'token') {
      if (!result.ohara) result.ohara = {}
      result.ohara.token = contract.contractAddress
    } else if (contractType === 'coin') {
      if (!result.app) result.app = {}
      result.app.coin = contract.contractAddress
    }
  }

  return result
}

/**
 * Ensure the storage directory and files exist
 */
async function ensureStorageExists(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch {
    // Directory might already exist
  }

  // Ensure contracts.json exists
  try {
    await fs.access(CONTRACTS_PATH)
  } catch {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify({}, null, 2))
  }

  // Ensure keys.json exists
  try {
    await fs.access(KEYS_PATH)
  } catch {
    await fs.writeFile(KEYS_PATH, JSON.stringify({}, null, 2))
  }

  // Ensure api-cache.json exists
  try {
    await fs.access(API_CACHE_PATH)
  } catch {
    await fs.writeFile(API_CACHE_PATH, JSON.stringify({}, null, 2))
  }
}
