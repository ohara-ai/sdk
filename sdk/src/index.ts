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

// Server-side Context
export {
  createServerOharaAi,
  clearOharaAiCache,
  type ServerOharaAiContext,
} from './server/createServerContext'

// Storage
export {
  getContracts,
  updateContracts,
  getControllerKey,
  getControllerAddress,
  type ContractAddresses,
  type OharaContracts,
  type GameContracts,
  type AppContracts,
} from './storage/contractStorage'

// Deployment
export {
  deployGameMatch,
  deployGameScore,
  getDeploymentConfig,
  getFactoryAddresses,
  type DeploymentConfig,
  type GameMatchDeployParams,
  type GameScoreDeployParams,
} from './deployment/deploymentService'

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

