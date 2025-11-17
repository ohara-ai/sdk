import fs from 'fs/promises'
import path from 'path'
import { privateKeyToAccount } from 'viem/accounts'
import { Address } from 'viem'
import type { OharaApiClient } from '../server/oharaApiClient'

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const CONTRACTS_PATH = path.join(STORAGE_DIR, 'contracts.json')
const KEYS_PATH = path.join(STORAGE_DIR, 'keys.json')

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

export async function getContracts(chainId: number): Promise<ContractAddresses> {
  const storage = await readContracts()
  return storage[chainId.toString()] || {}
}

export async function updateContracts(
  chainId: number,
  addresses: Partial<ContractAddresses>
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
  address: string
): Promise<void> {
  const storage = await readContracts()
  const chainKey = chainId.toString()
  
  if (!storage[chainKey]) {
    storage[chainKey] = {}
  }
  
  if (!storage[chainKey][context]) {
    storage[chainKey][context] = {}
  }
  
  // @ts-ignore - dynamic property assignment
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

export async function getControllerKey(): Promise<string> {
  const key = await getKey('controller')
  
  if (key) return key
  
  // Generate a new random private key if none exists
  const randomBytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes)
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto')
    const randomBuffer = nodeCrypto.randomBytes(32)
    randomBytes.set(randomBuffer)
  }
  
  const newPrivateKey = '0x' + Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  await setKey('controller', newPrivateKey)

  return newPrivateKey
}

export async function getControllerAddress(oharaApiClient?: OharaApiClient): Promise<Address | undefined> {
  // If API client is provided, fetch controller address from Ohara API
  if (oharaApiClient) {
    try {
      const walletInfo = await oharaApiClient.getWallet()
      return walletInfo.address
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
  return keys[keyName]
}

async function setKey(keyName: string, value: string): Promise<void> {
  const keys = await readKeys()
  keys[keyName] = value

  await ensureStorageExists()
  
  try {
    await fs.writeFile(KEYS_PATH, JSON.stringify(keys, null, 2))
  } catch (error) {
    console.error('Error writing keys storage:', error)
    throw error
  }
}


/**
 * Ensure the storage directory and files exist
 */
async function ensureStorageExists(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
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
}