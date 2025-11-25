/**
 * Source of contract address data
 */
export type ContractSource = 'api' | 'api-cache' | 'local'

/**
 * Contract addresses with metadata about their source
 */
export interface ContractAddressesWithMetadata {
  addresses: import('./contractsStorage').ContractAddresses
  source: ContractSource
  lastUpdated?: string
}
