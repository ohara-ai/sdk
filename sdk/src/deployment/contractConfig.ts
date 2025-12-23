import { deployGameScore } from './deployGameScore'
import { deployGameMatch } from './deployGameMatch'
import { deployGamePrize } from './deployGamePrize'
import { deployEventBus } from './deployEventBus'
import { deployLeague } from './deployLeague'
import { deployTournament } from './deployTournament'
import { deployPrediction } from './deployPrediction'
import type { DeploymentResult } from './deploymentService'
import { SCORE_ABI } from '../abis/game/score'
import { MATCH_ABI } from '../abis/game/match'
import { PRIZE_ABI } from '../abis/game/prize'
import { EVENT_BUS_ABI } from '../abis/base/eventBus'

// =============================================================================
// CONTRACT TYPES
// =============================================================================

/**
 * Supported contract types
 */
export type ContractType = 'Score' | 'Match' | 'Prize' | 'EventBus' | 'League' | 'Tournament' | 'Prediction'

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
  abi: readonly unknown[]
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
            abi: SCORE_ABI,
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
          abi: SCORE_ABI,
          functionName: 'setRecorderAuthorization',
          args: [matchAddress, true],
          description: 'Authorize Match contract to record scores',
        },
      ]
    },
  },

  Prize: {
    dependencies: ['Score', 'Match'],

    buildDeployParams: (deployedAddresses: Record<string, string>) => ({
      gameMatchAddress: deployedAddresses['Match'] as `0x${string}` | undefined,
    }),

    deploy: async (params: Record<string, unknown>) =>
      deployGamePrize(params as { gameMatchAddress?: `0x${string}` }),

    getPermissionActions: (context: PermissionContext) => {
      const scoreAddress = context.deployedAddresses['Score']
      const matchAddress = context.deployedAddresses['Match']
      const prizeAddress = context.deployedAddresses['Prize']

      if (!scoreAddress || !matchAddress || !prizeAddress) return []

      // Only set wiring if Prize was deployed in this batch
      if (!context.deployedInBatch.has('Prize')) return []

      return [
        {
          targetContract: scoreAddress,
          abi: SCORE_ABI,
          functionName: 'setPrize',
          args: [prizeAddress],
          description: 'Configure Score to forward winners to Prize pools',
        },
        {
          targetContract: prizeAddress,
          abi: PRIZE_ABI,
          functionName: 'setRecorderAuthorization',
          args: [scoreAddress, true],
          description: 'Authorize Score contract to record prize pool results',
        },
        {
          targetContract: matchAddress,
          abi: MATCH_ABI,
          functionName: 'registerShareRecipient',
          args: [prizeAddress, 100n],
          description: 'Register Prize contract as a share recipient in Match',
        },
      ]
    },
  },

  EventBus: {
    // EventBus has no dependencies - it's deployed first if needed
    dependencies: [],

    buildDeployParams: () => ({}),

    deploy: async () => deployEventBus({}),

    getPermissionActions: (context: PermissionContext) => {
      const eventBusAddress = context.deployedAddresses['EventBus']
      const matchAddress = context.deployedAddresses['Match']
      const scoreAddress = context.deployedAddresses['Score']

      if (!eventBusAddress) return []

      const actions: PermissionAction[] = []

      // Authorize Match to emit events
      if (matchAddress && context.deployedInBatch.has('EventBus')) {
        actions.push({
          targetContract: eventBusAddress,
          abi: EVENT_BUS_ABI,
          functionName: 'setEmitterAuthorization',
          args: [matchAddress, true],
          description: 'Authorize Match contract to emit events via EventBus',
        })
      }

      // Register Score as listener for match results
      if (scoreAddress && context.deployedInBatch.has('EventBus')) {
        actions.push({
          targetContract: eventBusAddress,
          abi: EVENT_BUS_ABI,
          functionName: 'registerListener',
          args: [1, scoreAddress], // EVENT_MATCH_RESULT = 1
          description: 'Register Score contract as listener for match results',
        })
      }

      return actions
    },
  },

  League: {
    // League depends on Match for recording results
    dependencies: ['Match'],

    buildDeployParams: (deployedAddresses: Record<string, string>) => ({
      matchAddress: deployedAddresses['Match'] as `0x${string}` | undefined,
    }),

    deploy: async (params: Record<string, unknown>) =>
      deployLeague(params as { matchAddress?: `0x${string}` }),

    getPermissionActions: () => {
      // League doesn't require special permission setup
      return []
    },
  },

  Tournament: {
    // Tournament depends on Score for match result tracking
    dependencies: ['Score'],

    buildDeployParams: (deployedAddresses: Record<string, string>) => ({
      scoreAddress: deployedAddresses['Score'] as `0x${string}` | undefined,
    }),

    deploy: async (params: Record<string, unknown>) =>
      deployTournament(params as { scoreAddress?: `0x${string}` }),

    getPermissionActions: () => {
      // Tournament doesn't require special permission setup
      return []
    },
  },

  Prediction: {
    // Prediction can optionally integrate with Match, Tournament, League
    dependencies: ['Match'],

    buildDeployParams: (deployedAddresses: Record<string, string>) => ({
      matchAddress: deployedAddresses['Match'] as `0x${string}` | undefined,
      tournamentAddress: deployedAddresses['Tournament'] as `0x${string}` | undefined,
      leagueAddress: deployedAddresses['League'] as `0x${string}` | undefined,
    }),

    deploy: async (params: Record<string, unknown>) =>
      deployPrediction(params as {
        matchAddress?: `0x${string}`
        tournamentAddress?: `0x${string}`
        leagueAddress?: `0x${string}`
      }),

    getPermissionActions: () => {
      // Prediction doesn't require special permission setup
      return []
    },
  },
}

/**
 * Get dependencies for a contract type
 */
export function getContractDependencies(type: ContractType): ContractType[] {
  return CONTRACT_CONFIG[type].dependencies
}
