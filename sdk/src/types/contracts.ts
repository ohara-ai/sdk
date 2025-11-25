/**
 * Contract types used by SDK components
 * These match the contractType values returned by the Ohara API
 */
export enum ContractType {
  GAME_SCORE = 'GameScore',
  GAME_MATCH = 'GameMatch',
}

/**
 * Deployed contract type identifiers (lowercase, as used in storage/API)
 * Maps to the context structure in ContractAddresses
 */
export type DeployedContractType = 'match' | 'score' | 'token' | 'coin'

/**
 * Type guard to check if a string is a valid DeployedContractType
 */
export function isDeployedContractType(value: string): value is DeployedContractType {
  return ['match', 'score', 'token', 'coin'].includes(value.toLowerCase())
}

/**
 * Normalize contract type string to DeployedContractType
 * Returns undefined if the type is not recognized
 */
export function normalizeContractType(value: string): DeployedContractType | undefined {
  const normalized = value.toLowerCase()
  return isDeployedContractType(normalized) ? normalized : undefined
}
