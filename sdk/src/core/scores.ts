import { PublicClient, Address } from 'viem'
import { GAME_SCORE_ABI } from '../abis/gameScore'

/**
 * Scores primitive - Core on-chain score tracking operations
 * Abstracts blockchain primitives for score and leaderboard management
 * 
 * Note: Score recording is handled by the GameMatch contract automatically.
 * This module only provides read operations for querying scores and leaderboards.
 */

export interface PlayerScore {
  player: Address
  totalWins: bigint
  totalPrize: bigint
  lastMatchId: bigint
  lastWinTimestamp: bigint
}

export interface TopPlayersResult {
  players: readonly Address[]
  wins: readonly bigint[]
  prizes: readonly bigint[]
}

export interface ScoreOperations {
  /**
   * Get a player's score data
   */
  getPlayerScore(player: Address): Promise<PlayerScore>
  
  /**
   * Get top players by wins
   */
  getTopPlayersByWins(limit: number): Promise<TopPlayersResult>
  
  /**
   * Get top players by prize money
   */
  getTopPlayersByPrize(limit: number): Promise<TopPlayersResult>
  
  /**
   * Get total number of players tracked
   */
  getTotalPlayers(): Promise<bigint>
  
  /**
   * Get total number of matches played
   */
  getTotalMatches(): Promise<bigint>
  
  /**
   * Get maximum losers allowed per match
   */
  getMaxLosersPerMatch(): Promise<bigint>
  
  /**
   * Get maximum total players allowed
   */
  getMaxTotalPlayers(): Promise<bigint>
  
  /**
   * Get maximum total matches allowed
   */
  getMaxTotalMatches(): Promise<bigint>
}

/**
 * Create Score operations for a specific GameScore contract
 */
export function createScoreOperations(
  contractAddress: Address,
  publicClient: PublicClient
): ScoreOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for score operations')
  }

  return {

    async getPlayerScore(player: Address): Promise<PlayerScore> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'getPlayerScore',
        args: [player],
      })

      return {
        player,
        totalWins: result[0],
        totalPrize: result[1],
        lastMatchId: result[2],
        lastWinTimestamp: result[3],
      }
    },

    async getTopPlayersByWins(limit: number): Promise<TopPlayersResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'getTopPlayersByWins',
        args: [BigInt(limit)],
      })

      return {
        players: result[0],
        wins: result[1],
        prizes: result[2],
      }
    },

    async getTopPlayersByPrize(limit: number): Promise<TopPlayersResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'getTopPlayersByPrize',
        args: [BigInt(limit)],
      })

      return {
        players: result[0],
        wins: result[1],
        prizes: result[2],
      }
    },

    async getTotalPlayers(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'getTotalPlayers',
        args: [],
      })
    },

    async getTotalMatches(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'getTotalMatches',
        args: [],
      })
    },

    async getMaxLosersPerMatch(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'maxLosersPerMatch',
      })
    },

    async getMaxTotalPlayers(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'maxTotalPlayers',
      })
    },

    async getMaxTotalMatches(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_SCORE_ABI,
        functionName: 'maxTotalMatches',
      })
    },
  }
}
