import { Address } from 'viem'
import {
  OharaApiClient,
  getOharaApiClient,
} from '../server/oharaApiClient'
import {
  getControllerKey as getControllerKeyFromStorage,
  deriveControllerAddress,
} from './keyStorage'
import {
  readApiCache,
  updateApiCache,
  convertToContractAddresses,
  convertCacheToContractAddresses,
} from './apiCache'
import {
  getContractsFromLocal,
  updateContracts as updateContractsInLocal,
  setContractAddress as setContractAddressInLocal,
} from './contractsStorage'

// Re-export types for public API
export type {
  OharaContracts,
  GameContracts,
  AppContracts,
  ContractAddresses,
} from './contractsStorage'
export type { ContractSource, ContractAddressesWithMetadata } from './types'

/**
 * Get contracts for a specific chain with metadata
 * 
 * Attempts to fetch from:
 * 1. Ohara API (if configured)
 * 2. API cache (if API fails)
 * 3. Local storage (fallback)
 * 
 * Returns metadata about the source and last update time
 */
export async function getContractsWithMetadata(
  chainId: number,
): Promise<import('./types').ContractAddressesWithMetadata> {
  const isApiMode = OharaApiClient.isConfigured()

  if (isApiMode) {
    try {
      const oharaApiClient = getOharaApiClient()
      const response = await oharaApiClient.getContracts()
      const contracts = response.data

      // Filter contracts by chainId and group by contractType
      const contractsByType: { [key: string]: any[] } = {}

      for (const contract of contracts) {
        if (contract.chainId === chainId) {
          if (!contractsByType[contract.contractType]) {
            contractsByType[contract.contractType] = []
          }
          contractsByType[contract.contractType].push(contract)
        }
      }

      // Select the newest contract for each type
      const newestContracts: { [key: string]: any } = {}
      let mostRecentUpdate: string | undefined

      for (const [contractType, contractsOfType] of Object.entries(
        contractsByType,
      )) {
        // Sort by createdAt descending (newest first)
        contractsOfType.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        newestContracts[contractType] = contractsOfType[0]
        
        // Track most recent update
        if (!mostRecentUpdate || new Date(contractsOfType[0].createdAt) > new Date(mostRecentUpdate)) {
          mostRecentUpdate = contractsOfType[0].createdAt
        }
      }

      // Update cache with the newest contracts
      await updateApiCache(chainId, newestContracts)

      // Convert to ContractAddresses format
      return {
        addresses: convertToContractAddresses(newestContracts),
        source: 'api',
        lastUpdated: mostRecentUpdate,
      }
    } catch (error) {
      console.error(
        'Failed to fetch contracts from API, falling back to cache:',
        error,
      )
      // Try to read from cache
      const cached = await readApiCache(chainId)
      if (cached) {
        // Find most recent cached contract
        const timestamps = Object.values(cached).map(c => c.createdAt)
        const mostRecent = timestamps.length > 0 
          ? timestamps.reduce((a, b) => new Date(a) > new Date(b) ? a : b)
          : undefined
        
        return {
          addresses: convertCacheToContractAddresses(cached),
          source: 'api-cache',
          lastUpdated: mostRecent,
        }
      }
    }
  }

  // Fall back to local storage
  return {
    addresses: await getContractsFromLocal(chainId),
    source: 'local',
    lastUpdated: undefined,
  }
}

/**
 * Get contracts for a specific chain (backward compatible)
 * 
 * Attempts to fetch from:
 * 1. Ohara API (if configured)
 * 2. API cache (if API fails)
 * 3. Local storage (fallback)
 */
export async function getContracts(
  chainId: number,
): Promise<import('./contractsStorage').ContractAddresses> {
  const result = await getContractsWithMetadata(chainId)
  return result.addresses
}

/**
 * Update contracts in local storage
 */
export async function updateContracts(
  chainId: number,
  addresses: Partial<import('./contractsStorage').ContractAddresses>,
): Promise<void> {
  return updateContractsInLocal(chainId, addresses)
}

/**
 * Set a specific contract address in local storage
 */
export async function setContractAddress(
  chainId: number,
  context: keyof import('./contractsStorage').ContractAddresses,
  contractType: string,
  address: string,
): Promise<void> {
  return setContractAddressInLocal(chainId, context, contractType, address)
}

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
  const isApiMode = OharaApiClient.isConfigured()
  return getControllerKeyFromStorage(isApiMode)
}

/**
 * Get the controller address
 * 
 * In API mode: fetches from Ohara API
 * In direct mode: derives from stored private key
 */
export async function getControllerAddress(): Promise<Address | undefined> {
  const isApiMode = OharaApiClient.isConfigured()

  if (isApiMode) {
    try {
      const oharaApiClient = getOharaApiClient()
      const walletInfo = await oharaApiClient.getWallet()
      return walletInfo.data.address
    } catch (error) {
      console.error('Failed to fetch controller address from Ohara API:', error)
      return undefined
    }
  }

  // Direct mode: derive from stored key
  try {
    const privateKey = await getControllerKey()
    return deriveControllerAddress(privateKey)
  } catch (error) {
    console.error('Failed to get controller address:', error)
    return undefined
  }
}
