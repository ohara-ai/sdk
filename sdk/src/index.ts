export { OharaAiProvider, useOharaAi } from './context/OharaAiProvider'

export { OharaAiWagmiProvider } from './context/OharaAiWagmiProvider'

// Types
export { ContractType } from './types/contracts'

// Errors
export {
  OharaError,
  ConfigError,
  StorageError,
  ApiError,
  ContractExecutionError,
  ValidationError,
  isOharaError,
  isConfigError,
  isApiError,
  isContractExecutionError,
} from './errors'

export type {
  OharaAiContext,
  OharaContext,
  GameContext,
  AppContext,
  InternalContext,
} from './context/OharaAiContext'

// Core Primitives
export {
  type HeapOperations,
  type HeapConfig,
  type Heap,
  HeapStatus,
} from './core/game/heap'

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
  type PrizeOperations,
  type PrizePool,
} from './core/game/prize'

export {
  type PredictionOperations,
  type PredictionWriteOperations,
  type ServerPredictionOperations,
  type Market,
  type Prediction,
  type PlayerOdds,
  type CommitData,
  type MarketSummary,
  CompetitionType,
} from './core/game/prediction'

export {
  type LeagueOperations,
  type ServerLeagueOperations,
  type Cycle,
  type PlayerStats as LeaguePlayerStats,
  type LeaderboardResult,
  type PlayerLeaderboardData,
  CycleStatus,
  sortLeaderboard,
  getTopN as getLeagueTopN,
} from './core/game/league'

export {
  type TournamentOperations,
  type ServerTournamentOperations,
  type TournamentView,
  type BracketMatch,
  type PendingMatchResult,
  TournamentStatus,
} from './core/game/tournament'

// Hooks
export {
  useTokenApproval,
  type UseTokenApprovalParams,
  type UseTokenApprovalReturn,
} from './hooks'

// ABIs
export {
  HEAP_ABI,
  HEAP_FACTORY_ABI,
  MATCH_ABI,
  SCORE_ABI,
  MATCH_FACTORY_ABI,
  SCORE_FACTORY_ABI,
  PRIZE_ABI,
  PRIZE_FACTORY_ABI,
  TOURNAMENT_ABI,
  TOURNAMENT_FACTORY_ABI,
  ERC20_ABI,
} from './abis'
