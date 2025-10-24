// Provider & Context
export { 
  OharaAiProvider, 
  useOharaAi,
} from './context/OharaAiProvider'

export type {
  OharaAiContext,
  OharaContext,
  GameContext,
  AppContext,
  InternalContext,
  DeployGameMatchParams,
  DeploymentResult,
} from './context/OharaAiContext'

// Core Primitives
export { 
  createClientMatchOperations,
  type MatchOperations,
  type MatchConfig,
  type Match,
  MatchStatus,
} from './core/match'

export {
  createScoreOperations,
  type ScoreOperations,
  type PlayerScore,
  type TopPlayersResult,
} from './core/scores'

export {
  createAppOperations,
  resolveContractAddresses,
  type AppOperations,
  type AppConfig,
} from './core/app'

// Contract Types
export { ContractType } from './types/contracts'

// Hooks
export {
  useTokenApproval,
  type UseTokenApprovalParams,
  type UseTokenApprovalReturn,
} from './hooks'

// ABIs
export {
  GAME_MATCH_ABI,
  GAME_SCORE_ABI,
  GAME_MATCH_FACTORY_ABI,
  GAME_SCORE_FACTORY_ABI,
  ERC20_ABI,
  MatchStatus as AbiMatchStatus,
} from './abis'

