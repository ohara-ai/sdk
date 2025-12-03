import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { SCORE_ABI } from '../../abis/game/score'
import type { OharaApiClient } from '../../server/oharaApiClient'

/**
 * Scores primitive - Core on-chain score tracking operations
 * Abstracts blockchain primitives for score and leaderboard management
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

/**
 * Client-side score operations (safe for user wallet)
 * Read-only operations for querying scores and leaderboards
 */
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
 * Server-only score operations (requires controller wallet or authorized recorder)
 * These operations should only be called from API routes using createServerOharaAi()
 */
export interface ServerScoreOperations extends ScoreOperations {
  /**
   * Record a match result with winner, losers, and prize (authorized recorder only - server-side only)
   */
  recordMatchResult(
    winner: Address,
    losers: Address[],
    prize: bigint,
  ): Promise<Hash>
}

/**
 * Create client-side Score operations (excludes server-only operations)
 * This should be used in client components and providers
 */
export function createClientScoreOperations(
  contractAddress: Address,
  publicClient: PublicClient,
): ScoreOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    undefined,
    false,
  ) as ScoreOperations
}

/**
 * Create Score operations for a specific GameScore contract
 * For server-side (controller wallet): returns ServerScoreOperations
 */
// Overload: without wallet client, returns base operations
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined,
  oharaApiClient?: undefined,
  chainId?: undefined,
): ScoreOperations

// Overload: with wallet client, returns server operations (includes recordMatchResult)
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ServerScoreOperations

// Implementation
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ScoreOperations | ServerScoreOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    walletClient,
    true,
    oharaApiClient,
    chainId,
  )
}

/**
 * Internal function to create score operations
 */
function createOperationsInternal(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  includeServerOps: boolean = true,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ScoreOperations | ServerScoreOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for score operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  const baseOperations: ScoreOperations = {
    async getPlayerScore(player: Address): Promise<PlayerScore> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
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
        abi: SCORE_ABI,
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
        abi: SCORE_ABI,
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
        abi: SCORE_ABI,
        functionName: 'getTotalPlayers',
        args: [],
      })
    },

    async getTotalMatches(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'getTotalMatches',
        args: [],
      })
    },

    async getMaxLosersPerMatch(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'maxLosersPerMatch',
      })
    },

    async getMaxTotalPlayers(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'maxTotalPlayers',
      })
    },

    async getMaxTotalMatches(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'maxTotalMatches',
      })
    },
  }

  // If no wallet client AND no API client provided, or client-only mode, return base operations only
  if ((!walletClient && !oharaApiClient) || !includeServerOps) {
    return baseOperations
  }

  // Server operations include recordMatchResult (authorized recorder only)
  const serverOperations: ServerScoreOperations = {
    ...baseOperations,

    async recordMatchResult(
      winner: Address,
      losers: Address[],
      prize: bigint,
    ): Promise<Hash> {
      // If API mode is enabled, use Ohara API
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'recordMatchResult',
          params: {
            winner: winner,
            losers: losers,
            prize: prize.toString(),
          },
          chainId,
        })

        // Wait for transaction confirmation
        const status = await oharaApiClient.waitForTransaction(
          result.data.txHash,
        )

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      // Otherwise, use direct on-chain execution
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'recordMatchResult',
        args: [winner, losers, prize],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
