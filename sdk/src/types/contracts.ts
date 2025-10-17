/**
 * Contract types used by SDK components
 */
export enum ContractType {
  SCOREBOARD = 'Scoreboard',
  GAME_MATCH = 'GameMatch',
}

/**
 * Contract dependency metadata for SDK components
 */
export interface ContractDependency {
  /** The type of contract required */
  contract: ContractType
  /** Whether this contract is required or optional */
  required: boolean
  /** Environment variable name for the contract address */
  envVar?: string
  /** Description of why this contract is needed */
  description?: string
}

/**
 * Component metadata including contract dependencies
 */
export interface ComponentMetadata {
  /** Component name */
  name: string
  /** Contract dependencies */
  dependencies: ContractDependency[]
  /** Additional description */
  description?: string
}
