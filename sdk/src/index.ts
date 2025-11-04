// Provider & Context
export { 
  OharaAiProvider, 
  useOharaAi,
} from './context/OharaAiProvider'

// Types
export { ContractType } from './types/contracts'

export type {
  OharaAiContext,
  OharaContext,
  GameContext,
  AppContext,
  InternalContext,
} from './context/OharaAiContext'

// Core Primitives
export {
  type MatchOperations,
  type MatchConfig,
  type Match,
  MatchStatus,
} from './core/game/match'

export {
  type ScoreOperations,
  type PlayerScore,
  type TopPlayersResult,
} from './core/game/scores'

export {
  type AppOperations,
  type AppConfig,
} from './core/app'

// Hooks
export {
  useTokenApproval,
  type UseTokenApprovalParams,
  type UseTokenApprovalReturn,
} from './hooks'

// ABIs
export {
  MATCH_ABI,
  SCORE_ABI,
  MATCH_FACTORY_ABI,
  SCORE_FACTORY_ABI,
  ERC20_ABI
} from './abis'

