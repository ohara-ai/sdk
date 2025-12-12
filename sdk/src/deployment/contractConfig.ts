import { deployGameScore } from './deployGameScore'
import { deployGameMatch } from './deployGameMatch'
import type { DeploymentResult } from './deploymentService'

// =============================================================================
// CONTRACT TYPES
// =============================================================================

/**
 * Supported contract types
 */
export type ContractType = 'Score' | 'Match'

/**
 * Context passed to permission functions
 */
export interface PermissionContext {
  /** All deployed contract addresses (both existing and newly deployed) */
  deployedAddresses: Record<string, string>
  /** Contracts that were deployed in this batch (not pre-existing) */
  deployedInBatch: Set<ContractType>
  /** Required contracts from requirements.json */
  requiredContracts: ContractType[]
  /** Controller wallet address for the app */
  controllerAddress?: string
}

/**
 * Permission action to execute
 */
export interface PermissionAction {
  targetContract: string
  functionName: string
  args: unknown[]
  description: string
}

// =============================================================================
// CONTRACT CONFIGURATION
// =============================================================================

/**
 * Configuration for each contract type
 */
export interface ContractConfig {
  /** Other contract types that must be deployed first */
  dependencies: ContractType[]
  
  /**
   * Build deployment parameters from already deployed contracts
   * @param deployedAddresses - Map of contract type to address for contracts deployed so far
   * @returns Parameters to pass to the deploy function
   */
  buildDeployParams: (deployedAddresses: Record<string, string>) => Record<string, unknown>
  
  /**
   * Deploy function for this contract type
   * @param params - Parameters built by buildDeployParams
   * @returns Deployment result with address and transaction hash
   */
  deploy: (params: Record<string, unknown>) => Promise<DeploymentResult>
  
  /**
   * Get permission actions needed after deployment
   * @param context - Context with all deployed addresses and deployment info
   * @returns Array of permission actions to execute (empty if none needed)
   */
  getPermissionActions: (context: PermissionContext) => PermissionAction[]
}

/**
 * Central configuration for all contract types
 * 
 * This encapsulates:
 * - Contract dependencies
 * - How to build deploy parameters from deployed contracts
 * - How to deploy each contract
 * - What permissions to set after deployment
 */
export const CONTRACT_CONFIG: Record<ContractType, ContractConfig> = {
  Score: {
    dependencies: [],
    
    buildDeployParams: () => ({}),
    
    deploy: async (params) => deployGameScore(params),
    
    getPermissionActions: (context) => {
      const scoreAddress = context.deployedAddresses['Score']
      if (!scoreAddress) return []

      // If Match was deployed in this batch, Match will handle recording
      // (Match permissions are set in Match config)
      if (context.deployedInBatch.has('Match')) {
        return []
      }

      // If Match already exists, it should already be authorized
      if (context.deployedAddresses['Match']) {
        return []
      }

      // If Match is required but not yet deployed, don't authorize controller
      // (Match will be deployed and authorized later)
      if (context.requiredContracts.includes('Match')) {
        return []
      }

      // No Match contract and not required - authorize controller to record scores directly
      if (context.controllerAddress) {
        return [
          {
            targetContract: scoreAddress,
            functionName: 'setRecorderAuthorization',
            args: [context.controllerAddress, true],
            description: 'Authorize controller to record scores (no Match contract)',
          },
        ]
      }

      return []
    },
  },
  
  Match: {
    dependencies: ['Score'],
    
    buildDeployParams: (deployedAddresses) => ({
      gameScoreAddress: deployedAddresses['Score'] as `0x${string}` | undefined,
    }),
    
    deploy: async (params) => deployGameMatch(params as { gameScoreAddress?: `0x${string}` }),
    
    getPermissionActions: (context) => {
      const scoreAddress = context.deployedAddresses['Score']
      const matchAddress = context.deployedAddresses['Match']
      
      // Need both Score and Match addresses
      if (!scoreAddress || !matchAddress) return []

      // Only set authorization if Match was just deployed in this batch
      // (existing Match contracts should already be authorized)
      if (!context.deployedInBatch.has('Match')) {
        return []
      }

      return [
        {
          targetContract: scoreAddress,
          functionName: 'setRecorderAuthorization',
          args: [matchAddress, true],
          description: 'Authorize Match contract to record scores',
        },
      ]
    },
  },
}

/**
 * Get dependencies for a contract type
 */
export function getContractDependencies(type: ContractType): ContractType[] {
  return CONTRACT_CONFIG[type].dependencies
}
