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

export interface PlayersResult {
  players: readonly Address[]
  wins: readonly bigint[]
  prizes: readonly bigint[]
}

/** @deprecated Use PlayersResult instead */
export type TopPlayersResult = PlayersResult

/**
 * Sorting utilities for client-side leaderboard sorting
 * Used since contracts no longer sort on-chain for gas optimization
 */
export type SortBy = 'wins' | 'prize'
export type SortOrder = 'asc' | 'desc'

export interface PlayerData {
  player: Address
  wins: bigint
  prize: bigint
}

/**
 * Sort player data by specified field and order
 */
export function sortPlayers(
  data: PlayersResult,
  sortBy: SortBy = 'wins',
  order: SortOrder = 'desc'
): PlayerData[] {
  const players: PlayerData[] = data.players.map((player, i) => ({
    player,
    wins: data.wins[i],
    prize: data.prizes[i],
  }))

  return players.sort((a, b) => {
    const aVal = sortBy === 'wins' ? a.wins : a.prize
    const bVal = sortBy === 'wins' ? b.wins : b.prize
    const diff = aVal - bVal
    if (order === 'desc') {
      return diff > 0n ? -1 : diff < 0n ? 1 : 0
    }
    return diff > 0n ? 1 : diff < 0n ? -1 : 0
  })
}

/**
 * Get top N players sorted by specified field
 */
export function getTopN(
  data: PlayersResult,
  limit: number,
  sortBy: SortBy = 'wins',
  order: SortOrder = 'desc'
): PlayerData[] {
  return sortPlayers(data, sortBy, order).slice(0, limit)
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
   * Get all players with scores (unsorted - use sortPlayers utility for sorting)
   * @param limit Maximum number of players to return
   */
  getPlayers(limit: number): Promise<PlayersResult>

  /**
   * Get players with pagination (unsorted - use sortPlayers utility for sorting)
   * @param offset Starting index
   * @param limit Maximum number of players to return
   */
  getPlayersPaginated(offset: number, limit: number): Promise<PlayersResult>

  /**
   * Get top players by wins (sorted client-side)
   * @deprecated Use getPlayers() with sortPlayers() utility instead
   */
  getTopPlayersByWins(limit: number): Promise<PlayersResult>

  /**
   * Get top players by prize money (sorted client-side)
   * @deprecated Use getPlayers() with sortPlayers() utility instead
   */
  getTopPlayersByPrize(limit: number): Promise<PlayersResult>

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
   * Record a match result with winner, losers, prize, and token (authorized recorder only - server-side only)
   * @param token The reward token address (address(0) for native token)
   */
  recordMatchResult(
    winner: Address,
    losers: Address[],
    prize: bigint,
    token: Address,
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

    async getPlayers(limit: number): Promise<PlayersResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'getPlayers',
        args: [BigInt(limit)],
      })

      return {
        players: result[0],
        wins: result[1],
        prizes: result[2],
      }
    },

    async getPlayersPaginated(offset: number, limit: number): Promise<PlayersResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'getPlayersPaginated',
        args: [BigInt(offset), BigInt(limit)],
      })

      return {
        players: result[0],
        wins: result[1],
        prizes: result[2],
      }
    },

    async getTopPlayersByWins(limit: number): Promise<PlayersResult> {
      // Fetch unsorted data and sort client-side
      const data = await this.getPlayers(limit * 2) // Fetch extra for better results
      const sorted = getTopN(data, limit, 'wins', 'desc')
      return {
        players: sorted.map(p => p.player),
        wins: sorted.map(p => p.wins),
        prizes: sorted.map(p => p.prize),
      }
    },

    async getTopPlayersByPrize(limit: number): Promise<PlayersResult> {
      // Fetch unsorted data and sort client-side
      const data = await this.getPlayers(limit * 2) // Fetch extra for better results
      const sorted = getTopN(data, limit, 'prize', 'desc')
      return {
        players: sorted.map(p => p.player),
        wins: sorted.map(p => p.wins),
        prizes: sorted.map(p => p.prize),
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
      token: Address,
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
            token: token,
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
        args: [winner, losers, prize, token],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
