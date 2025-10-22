// Provider & Context
export { 
  OharaAiProvider, 
  useOharaAi,
} from './context/OnchainContext'

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

// ABIs
export { SCOREBOARD_ABI } from './abis/scoreboard'
export { GAME_MATCH_ABI } from './abis/gameMatch'

// Utils
export { formatAddress, formatTokenAmount } from './utils/format'
