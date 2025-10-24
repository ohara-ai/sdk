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
  createMatchOperations,
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

