import { PublicClient, WalletClient, Address } from 'viem'
import { createClientMatchOperations, MatchOperations } from './match'
import { createScoreOperations, ScoreOperations } from './scores'

/**
 * App primitive - Combines Match and Scores operations
 * Provides a high-level interface for building on-chain gaming applications
 */

export interface AppConfig {
  /**
   * GameMatch contract address (required for match operations)
   */
  gameMatchAddress?: Address
  
  /**
   * GameScore contract address (required for score operations)
   */
  gameScoreAddress?: Address
  
  /**
   * Public client for reading blockchain data
   */
  publicClient: PublicClient
  
  /**
   * Wallet client for write operations (optional - required for mutations)
   */
  walletClient?: WalletClient
  
  /**
   * Chain ID for contract resolution
   */
  chainId?: number
}

export interface AppOperations {
  /**
   * Match operations - undefined if gameMatchAddress not configured
   */
  match?: MatchOperations
  
  /**
   * Score operations - undefined if gameScoreAddress not configured
   */
  scores?: ScoreOperations
  
  /**
   * Check if match operations are available
   */
  hasMatchSupport(): boolean
  
  /**
   * Check if score operations are available
   */
  hasScoreSupport(): boolean
  
  /**
   * Get configuration
   */
  getConfig(): AppConfig
}

/**
 * Create App operations with automatic dependency resolution
 * This is the main entry point for building on-chain gaming applications
 */
export function createAppOperations(config: AppConfig): AppOperations {
  const { gameMatchAddress, gameScoreAddress, publicClient, walletClient } = config

  // Initialize match operations if address is provided
  const match = gameMatchAddress
    ? createClientMatchOperations(gameMatchAddress, publicClient, walletClient)
    : undefined

  // Initialize score operations if address is provided
  const scores = gameScoreAddress
    ? createScoreOperations(gameScoreAddress, publicClient)
    : undefined

  return {
    match,
    scores,
    
    hasMatchSupport() {
      return !!match
    },
    
    hasScoreSupport() {
      return !!scores
    },
    
    getConfig() {
      return config
    },
  }
}

/**
 * Utility to resolve contract addresses from environment or storage
 */
export function resolveContractAddresses(env: Record<string, string | undefined>, chainId?: number): {
  gameMatchAddress?: Address
  gameScoreAddress?: Address
} {
  let gameMatchAddress: Address | undefined
  let gameScoreAddress: Address | undefined

  // Try to get from environment
  const gameMatchEnv = env.NEXT_PUBLIC_GAME_MATCH_INSTANCE || env.NEXT_PUBLIC_GAME_MATCH_ADDRESS
  const gameScoreEnv = env.NEXT_PUBLIC_GAMESCORE_ADDRESS || env.NEXT_PUBLIC_GAMESCORE_INSTANCE

  if (gameMatchEnv && gameMatchEnv !== '0x0000000000000000000000000000000000000000') {
    gameMatchAddress = gameMatchEnv as Address
  }

  if (gameScoreEnv && gameScoreEnv !== '0x0000000000000000000000000000000000000000') {
    gameScoreAddress = gameScoreEnv as Address
  }

  // Try to get from localStorage if in browser
  if (typeof window !== 'undefined' && chainId) {
    const storedGameMatch = localStorage.getItem(`deployed_game_match_${chainId}`)
    const storedGameScore = localStorage.getItem(`deployed_gamescore_${chainId}`)

    if (storedGameMatch && !gameMatchAddress) {
      gameMatchAddress = storedGameMatch as Address
    }

    if (storedGameScore && !gameScoreAddress) {
      gameScoreAddress = storedGameScore as Address
    }
  }

  return { gameMatchAddress, gameScoreAddress }
}
