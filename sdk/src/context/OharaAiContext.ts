import { Address } from 'viem'
import { MatchOperations, ServerMatchOperations } from '../core/game/match'
import { ScoreOperations } from '../core/game/scores'
import { PrizeOperations } from '../core/game/prize'
import { PredictionOperations, ServerPredictionOperations } from '../core/game/prediction'

/**
 * OharaAi Context Structure
 * Provides a hierarchical organization of contract addresses and operations
 */

// Ohara-managed contracts
export interface OharaContext {
  contracts: {
    /** $HELLOWORLD token address from ENV */
    token?: Address
  }
}

// Game-related contracts and operations (client-side)
export interface GameContext {
  match: {
    /** GameMatch contract address */
    address?: Address
    /** Match operations (create, join, withdraw, get) */
    operations?: MatchOperations
  }
  scores: {
    /** GameScore contract address */
    address?: Address
    /** Score operations (byWins, byPrize) */
    operations?: ScoreOperations
  }
  prize: {
    /** GamePrize contract address */
    address?: Address
    /** Prize operations (pools, claim) */
    operations?: PrizeOperations
  }
  prediction: {
    /** Prediction contract address */
    address?: Address
    /** Prediction operations (markets, betting, claims) */
    operations?: PredictionOperations
  }
}

// Game-related contracts and operations (server-side)
export interface ServerGameContext {
  match: {
    /** GameMatch contract address */
    address?: Address
    /** Server match operations (includes activate, finalize) */
    operations?: ServerMatchOperations
  }
  scores: {
    /** GameScore contract address */
    address?: Address
    /** Score operations (byWins, byPrize) */
    operations?: ScoreOperations
  }
  prize: {
    /** GamePrize contract address */
    address?: Address
    /** Prize operations (pools, claim) */
    operations?: PrizeOperations
  }
  prediction: {
    /** Prediction contract address */
    address?: Address
    /** Server prediction operations (includes createMarket, closeBetting) */
    operations?: ServerPredictionOperations
  }
}

// Application-level contracts
export interface AppContext {
  /** Application coin/token contract */
  coin: {
    address?: Address
  }
  /** Controller contract for permissions */
  controller: {
    address?: Address
  }
  /** Chain ID */
  chainId?: number
}

// Internal configuration and services
export interface InternalContext {
  /** Factory contract addresses */
  factories?: {
    gameMatch?: Address
    gameScore?: Address
    gamePrize?: Address
    prediction?: Address
  }
}

/**
 * Complete OharaAi context structure
 */
export interface OharaAiContext {
  /** Ohara-managed contracts (token, etc.) */
  ohara: OharaContext

  /** Game contracts and operations */
  game: GameContext

  /** Application contracts */
  app: AppContext

  /** Internal configuration */
  internal: InternalContext

  /** Manually refresh contract addresses from backend */
  loadAddresses: () => Promise<void>
}
