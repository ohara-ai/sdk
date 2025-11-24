import fs from 'fs/promises'
import path from 'path'
import { Address } from 'viem'
import type { DeployedContract } from '../server/oharaApiClient'
import type { ContractAddresses } from './contractsStorage'
import { normalizeContractType, type DeployedContractType } from '../types/contracts'

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const API_CACHE_PATH = path.join(STORAGE_DIR, 'api-cache.json')

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

/**
 * Ensure storage directory and API cache file exist
 */
async function ensureApiCacheExists(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch {
    // Directory might already exist
  }

  try {
    await fs.access(API_CACHE_PATH)
  } catch {
    await fs.writeFile(API_CACHE_PATH, JSON.stringify({}, null, 2))
  }
}

/**
 * Read API cache for a specific chain
 */
export async function readApiCache(
  chainId: number,
): Promise<{ [contractType: string]: CachedContract } | null> {
  await ensureApiCacheExists()

  try {
    const content = await fs.readFile(API_CACHE_PATH, 'utf-8')
    const cache: ApiCacheStorage = JSON.parse(content)
    return cache[chainId.toString()] || null
  } catch {
    return null
  }
}

/**
 * Update API cache with new contracts
 */
export async function updateApiCache(
  chainId: number,
  contracts: { [key: string]: DeployedContract },
): Promise<void> {
  await ensureApiCacheExists()

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

/**
 * Convert deployed contracts to ContractAddresses format
 */
export function convertToContractAddresses(contracts: {
  [key: string]: DeployedContract
}): ContractAddresses {
  const result: ContractAddresses = {}

  for (const contract of Object.values(contracts)) {
    const contractType = normalizeContractType(contract.contractType)
    
    if (!contractType) {
      console.warn(`Unknown contract type: ${contract.contractType}`)
      continue
    }

    // Map contract types to the appropriate context using exhaustive switch
    switch (contractType) {
      case 'match':
        if (!result.game) result.game = {}
        result.game.match = contract.contractAddress
        break
      case 'score':
        if (!result.game) result.game = {}
        result.game.score = contract.contractAddress
        break
      case 'token':
        if (!result.ohara) result.ohara = {}
        result.ohara.token = contract.contractAddress
        break
      case 'coin':
        if (!result.app) result.app = {}
        result.app.coin = contract.contractAddress
        break
      default:
        // TypeScript will error here if we miss a case
        const _exhaustive: never = contractType
        console.warn(`Unhandled contract type: ${_exhaustive}`)
    }
  }

  return result
}

/**
 * Convert cached contracts to ContractAddresses format
 */
export function convertCacheToContractAddresses(cache: {
  [contractType: string]: CachedContract
}): ContractAddresses {
  const result: ContractAddresses = {}

  for (const contract of Object.values(cache)) {
    const contractType = normalizeContractType(contract.contractType)
    
    if (!contractType) {
      console.warn(`Unknown contract type in cache: ${contract.contractType}`)
      continue
    }

    // Map contract types to the appropriate context using exhaustive switch
    switch (contractType) {
      case 'match':
        if (!result.game) result.game = {}
        result.game.match = contract.contractAddress
        break
      case 'score':
        if (!result.game) result.game = {}
        result.game.score = contract.contractAddress
        break
      case 'token':
        if (!result.ohara) result.ohara = {}
        result.ohara.token = contract.contractAddress
        break
      case 'coin':
        if (!result.app) result.app = {}
        result.app.coin = contract.contractAddress
        break
      default:
        // TypeScript will error here if we miss a case
        const _exhaustive: never = contractType
        console.warn(`Unhandled contract type in cache: ${_exhaustive}`)
    }
  }

  return result
}
