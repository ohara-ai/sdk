import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { LEAGUE_ABI } from '../../abis/game/league'
import type { OharaApiClient } from '../../server/oharaApiClient'

/**
 * League primitive - Core on-chain league tracking operations
 * Abstracts blockchain primitives for cycle-based player rankings and leaderboards
 */

/**
 * Cycle status enum matching the contract
 */
export enum CycleStatus {
  Registration = 0,
  Active = 1,
  Finalized = 2,
}

/**
 * Cycle metadata
 */
export interface Cycle {
  startTime: bigint
  endTime: bigint
  status: CycleStatus
}

/**
 * Player stats for a specific cycle and token
 */
export interface PlayerStats {
  wins: bigint
  losses: bigint
  tokensWon: bigint
  rank: bigint
}

/**
 * Leaderboard result with players and their token amounts
 */
export interface LeaderboardResult {
  players: readonly Address[]
  tokensWon: readonly bigint[]
}

/**
 * Player data for client-side sorting
 */
export interface PlayerLeaderboardData {
  player: Address
  tokensWon: bigint
}

/**
 * Sort leaderboard data by tokens won
 */
export function sortLeaderboard(
  data: LeaderboardResult,
  order: 'asc' | 'desc' = 'desc'
): PlayerLeaderboardData[] {
  const players: PlayerLeaderboardData[] = data.players.map((player, i) => ({
    player,
    tokensWon: data.tokensWon[i],
  }))

  return players.sort((a, b) => {
    const diff = a.tokensWon - b.tokensWon
    if (order === 'desc') {
      return diff > 0n ? -1 : diff < 0n ? 1 : 0
    }
    return diff > 0n ? 1 : diff < 0n ? -1 : 0
  })
}

/**
 * Get top N players from leaderboard
 */
export function getTopN(
  data: LeaderboardResult,
  limit: number,
  order: 'asc' | 'desc' = 'desc'
): PlayerLeaderboardData[] {
  return sortLeaderboard(data, order).slice(0, limit)
}

/**
 * Client-side league operations (safe for user wallet)
 * Read-only operations for querying league data
 */
export interface LeagueOperations {
  /**
   * Get the current cycle ID
   */
  getCurrentCycleId(): Promise<bigint>

  /**
   * Get cycle metadata
   */
  getCycle(cycleId: bigint): Promise<Cycle>

  /**
   * Get player stats for a specific cycle and token
   */
  getPlayerStats(cycleId: bigint, player: Address, token: Address): Promise<PlayerStats>

  /**
   * Get leaderboard for a cycle and token
   * For live cycles, returns unsorted data - use sortLeaderboard utility for sorting
   */
  getLeaderboard(cycleId: bigint, token: Address, count: number): Promise<LeaderboardResult>

  /**
   * Get top players for a cycle (uses native token by default)
   * For live cycles, returns unsorted data - use sortLeaderboard utility for sorting
   */
  getTopPlayers(cycleId: bigint, count: number): Promise<LeaderboardResult>

  /**
   * Get a player's rank for a cycle and token
   * Returns 0 if not ranked
   */
  getPlayerRank(cycleId: bigint, player: Address, token: Address): Promise<bigint>

  /**
   * Get all tokens in a cycle
   */
  getCycleTokens(cycleId: bigint): Promise<readonly Address[]>

  /**
   * Get all players in a cycle
   */
  getCyclePlayers(cycleId: bigint): Promise<readonly Address[]>

  /**
   * Get cycle duration in seconds
   */
  getCycleDuration(): Promise<bigint>

  /**
   * Get cycle player count
   */
  getCyclePlayerCount(cycleId: bigint): Promise<bigint>

  /**
   * Get cycle token count
   */
  getCycleTokenCount(cycleId: bigint): Promise<bigint>

  /**
   * Check if a cycle has started
   */
  isCycleStarted(): Promise<boolean>

  /**
   * Get the oldest cycle ID still in storage
   */
  getOldestCycleId(): Promise<bigint>

  /**
   * Get the match contract address
   */
  getMatchContract(): Promise<Address>

  /**
   * Get max cycles kept configuration
   */
  getMaxCyclesKept(): Promise<bigint>

  /**
   * Get contract constants
   */
  getConstants(): Promise<{
    defaultCycleDuration: bigint
    minCycleDuration: bigint
    maxCycleDuration: bigint
    maxLeaderboardSize: bigint
    maxPlayersPerCycle: bigint
    maxTokensPerCycle: bigint
    topPlayersCount: bigint
    defaultMaxCyclesKept: bigint
    minCyclesKept: bigint
  }>
}

/**
 * Server-only league operations (requires controller wallet)
 * These operations should only be called from API routes using createServerOharaAi()
 */
export interface ServerLeagueOperations extends LeagueOperations {
  /**
   * Force finalize the current cycle (controller only)
   */
  finalizeCycle(): Promise<Hash>

  /**
   * Set the match contract (controller only)
   */
  setMatchContract(matchContract: Address): Promise<Hash>

  /**
   * Set the prediction contract for automatic betting closure (controller only)
   */
  setPrediction(prediction: Address): Promise<Hash>

  /**
   * Set the cycle duration (owner only)
   */
  setCycleDuration(duration: bigint): Promise<Hash>

  /**
   * Set max cycles kept (owner only)
   */
  setMaxCyclesKept(maxCycles: bigint): Promise<Hash>

  /**
   * Clean up old cycle data (owner only)
   */
  cleanupCycle(cycleId: bigint): Promise<Hash>
}

/**
 * Create client-side League operations (excludes server-only operations)
 * This should be used in client components and providers
 */
export function createClientLeagueOperations(
  contractAddress: Address,
  publicClient: PublicClient,
): LeagueOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    undefined,
    false,
  ) as LeagueOperations
}

/**
 * Create League operations for a specific League contract
 * For server-side (controller wallet): returns ServerLeagueOperations
 */
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined,
  oharaApiClient?: undefined,
  chainId?: undefined,
): LeagueOperations

export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ServerLeagueOperations

export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): LeagueOperations | ServerLeagueOperations {
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
 * Internal function to create league operations
 */
function createOperationsInternal(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  includeServerOps: boolean = true,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): LeagueOperations | ServerLeagueOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for league operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  const baseOperations: LeagueOperations = {
    async getCurrentCycleId(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCurrentCycleId',
      })
    },

    async getCycle(cycleId: bigint): Promise<Cycle> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCycle',
        args: [cycleId],
      })

      return {
        startTime: result.startTime,
        endTime: result.endTime,
        status: result.status as CycleStatus,
      }
    },

    async getPlayerStats(cycleId: bigint, player: Address, token: Address): Promise<PlayerStats> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getPlayerStats',
        args: [cycleId, player, token],
      })

      return {
        wins: result.wins,
        losses: result.losses,
        tokensWon: result.tokensWon,
        rank: result.rank,
      }
    },

    async getLeaderboard(cycleId: bigint, token: Address, count: number): Promise<LeaderboardResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getLeaderboard',
        args: [cycleId, token, BigInt(count)],
      })

      return {
        players: result[0],
        tokensWon: result[1],
      }
    },

    async getTopPlayers(cycleId: bigint, count: number): Promise<LeaderboardResult> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getTopPlayers',
        args: [cycleId, BigInt(count)],
      })

      return {
        players: result[0],
        tokensWon: result[1],
      }
    },

    async getPlayerRank(cycleId: bigint, player: Address, token: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getPlayerRank',
        args: [cycleId, player, token],
      })
    },

    async getCycleTokens(cycleId: bigint): Promise<readonly Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCycleTokens',
        args: [cycleId],
      })
    },

    async getCyclePlayers(cycleId: bigint): Promise<readonly Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCyclePlayers',
        args: [cycleId],
      })
    },

    async getCycleDuration(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCycleDuration',
      })
    },

    async getCyclePlayerCount(cycleId: bigint): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCyclePlayerCount',
        args: [cycleId],
      })
    },

    async getCycleTokenCount(cycleId: bigint): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getCycleTokenCount',
        args: [cycleId],
      })
    },

    async isCycleStarted(): Promise<boolean> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'isCycleStarted',
      })
    },

    async getOldestCycleId(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'getOldestCycleId',
      })
    },

    async getMatchContract(): Promise<Address> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'matchContract',
      })
    },

    async getMaxCyclesKept(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'maxCyclesKept',
      })
    },

    async getConstants(): Promise<{
      defaultCycleDuration: bigint
      minCycleDuration: bigint
      maxCycleDuration: bigint
      maxLeaderboardSize: bigint
      maxPlayersPerCycle: bigint
      maxTokensPerCycle: bigint
      topPlayersCount: bigint
      defaultMaxCyclesKept: bigint
      minCyclesKept: bigint
    }> {
      const [
        defaultCycleDuration,
        minCycleDuration,
        maxCycleDuration,
        maxLeaderboardSize,
        maxPlayersPerCycle,
        maxTokensPerCycle,
        topPlayersCount,
        defaultMaxCyclesKept,
        minCyclesKept,
      ] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'DEFAULT_CYCLE_DURATION',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MIN_CYCLE_DURATION',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MAX_CYCLE_DURATION',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MAX_LEADERBOARD_SIZE',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MAX_PLAYERS_PER_CYCLE',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MAX_TOKENS_PER_CYCLE',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'TOP_PLAYERS_COUNT',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'DEFAULT_MAX_CYCLES_KEPT',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: LEAGUE_ABI,
          functionName: 'MIN_CYCLES_KEPT',
        }),
      ])

      return {
        defaultCycleDuration,
        minCycleDuration,
        maxCycleDuration,
        maxLeaderboardSize,
        maxPlayersPerCycle,
        maxTokensPerCycle,
        topPlayersCount,
        defaultMaxCyclesKept,
        minCyclesKept,
      }
    },
  }

  // If no wallet client AND no API client provided, or client-only mode, return base operations only
  if ((!walletClient && !oharaApiClient) || !includeServerOps) {
    return baseOperations
  }

  // Server operations include write functions (controller/owner only)
  const serverOperations: ServerLeagueOperations = {
    ...baseOperations,

    async finalizeCycle(): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'finalizeCycle',
          params: {},
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'finalizeCycle',
        account,
        chain: undefined,
      })
    },

    async setMatchContract(matchContract: Address): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setMatchContract',
          params: { _matchContract: matchContract },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'setMatchContract',
        args: [matchContract],
        account,
        chain: undefined,
      })
    },

    async setPrediction(prediction: Address): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setPrediction',
          params: { _prediction: prediction },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'setPrediction',
        args: [prediction],
        account,
        chain: undefined,
      })
    },

    async setCycleDuration(duration: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setCycleDuration',
          params: { _cycleDuration: duration.toString() },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'setCycleDuration',
        args: [duration],
        account,
        chain: undefined,
      })
    },

    async setMaxCyclesKept(maxCycles: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setMaxCyclesKept',
          params: { _maxCyclesKept: maxCycles.toString() },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'setMaxCyclesKept',
        args: [maxCycles],
        account,
        chain: undefined,
      })
    },

    async cleanupCycle(cycleId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'cleanupCycle',
          params: { cycleId: cycleId.toString() },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: LEAGUE_ABI,
        functionName: 'cleanupCycle',
        args: [cycleId],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
