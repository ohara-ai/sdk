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
