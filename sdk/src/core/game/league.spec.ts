/**
 * League Operations Specification Tests
 *
 * Tests the core league primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createClientLeagueOperations,
  sortLeaderboard,
  getTopN,
  CycleStatus,
} from './league'
import type { LeagueOperations, LeaderboardResult } from './league'
import { createMockPublicClient } from '../../__tests__/mocks/clients'
import { assertHasOperations } from '../../__tests__/utils/assertions'

/**
 * Mock cycle data
 */
function createMockCycle(status: CycleStatus = CycleStatus.Active) {
  return {
    startTime: BigInt(Date.now() - 3600000),
    endTime: BigInt(Date.now() + 3600000),
    status,
  }
}

/**
 * Mock player stats data
 */
function createMockPlayerStats() {
  return {
    wins: 5n,
    losses: 2n,
    tokensWon: 10000000000000000000n,
    rank: 3n,
  }
}

/**
 * Mock leaderboard data
 */
function createMockLeaderboard() {
  return [
    [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ],
    [20000000000000000000n, 10000000000000000000n],
  ]
}

describe('League Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210' as const
  const PLAYER_ADDRESS = '0x1111111111111111111111111111111111111111' as const
  const TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createClientLeagueOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()

      const operations = createClientLeagueOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      assertHasOperations(operations, [
        'getCurrentCycleId',
        'getCycle',
        'getPlayerStats',
        'getLeaderboard',
        'getTopPlayers',
        'getPlayerRank',
        'getCycleTokens',
        'getCyclePlayers',
        'getCycleDuration',
        'getCyclePlayerCount',
        'getCycleTokenCount',
        'isCycleStarted',
        'getOldestCycleId',
        'getScoreContract',
        'getMaxCyclesKept',
        'getConstants',
      ])
    })

    it('SPEC: throws error when publicClient is missing', () => {
      expect(() => {
        createClientLeagueOperations(CONTRACT_ADDRESS, null as any)
      }).toThrow('PublicClient is required for league operations')
    })
  })

  describe('Specification: Cycle Queries', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getCurrentCycleId() - returns current cycle ID', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(5n)

      const cycleId = await operations.getCurrentCycleId()

      expect(cycleId).toBe(5n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getCurrentCycleId',
        }),
      )
    })

    it('SPEC: getCycle() - returns complete cycle object', async () => {
      const mockCycle = createMockCycle()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockCycle)

      const cycle = await operations.getCycle(1n)

      expect(cycle).toEqual({
        startTime: mockCycle.startTime,
        endTime: mockCycle.endTime,
        status: CycleStatus.Active,
      })
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getCycle',
          args: [1n],
        }),
      )
    })

    it('SPEC: getCycle() - handles finalized cycle status', async () => {
      const mockCycle = createMockCycle(CycleStatus.Finalized)
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockCycle)

      const cycle = await operations.getCycle(0n)

      expect(cycle.status).toBe(CycleStatus.Finalized)
    })

    it('SPEC: isCycleStarted() - returns boolean', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(true)

      const started = await operations.isCycleStarted()

      expect(started).toBe(true)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'isCycleStarted',
        }),
      )
    })
  })

  describe('Specification: Player Stats Queries', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getPlayerStats() - returns complete player stats object', async () => {
      const mockStats = createMockPlayerStats()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockStats)

      const stats = await operations.getPlayerStats(1n, PLAYER_ADDRESS, TOKEN_ADDRESS)

      expect(stats).toEqual({
        wins: 5n,
        losses: 2n,
        tokensWon: 10000000000000000000n,
        rank: 3n,
      })
    })

    it('SPEC: getPlayerStats() - calls contract with correct parameters', async () => {
      const mockStats = createMockPlayerStats()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockStats)

      await operations.getPlayerStats(1n, PLAYER_ADDRESS, TOKEN_ADDRESS)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getPlayerStats',
          args: [1n, PLAYER_ADDRESS, TOKEN_ADDRESS],
        }),
      )
    })

    it('SPEC: getPlayerStats() - handles player with no stats', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue({
        wins: 0n,
        losses: 0n,
        tokensWon: 0n,
        rank: 0n,
      })

      const stats = await operations.getPlayerStats(1n, PLAYER_ADDRESS, TOKEN_ADDRESS)

      expect(stats.wins).toBe(0n)
      expect(stats.tokensWon).toBe(0n)
      expect(stats.rank).toBe(0n)
    })

    it('SPEC: getPlayerRank() - returns player rank', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(3n)

      const rank = await operations.getPlayerRank(1n, PLAYER_ADDRESS, TOKEN_ADDRESS)

      expect(rank).toBe(3n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPlayerRank',
          args: [1n, PLAYER_ADDRESS, TOKEN_ADDRESS],
        }),
      )
    })
  })

  describe('Specification: Leaderboard Queries', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getLeaderboard() - returns player addresses and tokens won', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockLeaderboard(),
      )

      const result = await operations.getLeaderboard(1n, TOKEN_ADDRESS, 10)

      expect(result).toEqual({
        players: expect.any(Array),
        tokensWon: expect.any(Array),
      })
      expect(result.players.length).toBe(result.tokensWon.length)
    })

    it('SPEC: getLeaderboard() - calls contract with correct parameters', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockLeaderboard(),
      )

      await operations.getLeaderboard(1n, TOKEN_ADDRESS, 10)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getLeaderboard',
          args: [1n, TOKEN_ADDRESS, 10n],
        }),
      )
    })

    it('SPEC: getTopPlayers() - returns top players for native token', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockLeaderboard(),
      )

      const result = await operations.getTopPlayers(1n, 10)

      expect(result.players.length).toBeGreaterThan(0)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTopPlayers',
          args: [1n, 10n],
        }),
      )
    })

    it('SPEC: leaderboard handles empty results', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([[], []])

      const result = await operations.getLeaderboard(1n, TOKEN_ADDRESS, 10)

      expect(result.players).toEqual([])
      expect(result.tokensWon).toEqual([])
    })
  })

  describe('Specification: Sorting Utilities', () => {
    const mockData: LeaderboardResult = {
      players: [
        '0x1111111111111111111111111111111111111111' as const,
        '0x2222222222222222222222222222222222222222' as const,
        '0x3333333333333333333333333333333333333333' as const,
      ],
      tokensWon: [5000n, 10000n, 3000n],
    }

    it('SPEC: sortLeaderboard() - sorts by tokens won descending by default', () => {
      const sorted = sortLeaderboard(mockData)

      expect(sorted[0].tokensWon).toBe(10000n)
      expect(sorted[1].tokensWon).toBe(5000n)
      expect(sorted[2].tokensWon).toBe(3000n)
    })

    it('SPEC: sortLeaderboard() - sorts ascending', () => {
      const sorted = sortLeaderboard(mockData, 'asc')

      expect(sorted[0].tokensWon).toBe(3000n)
      expect(sorted[1].tokensWon).toBe(5000n)
      expect(sorted[2].tokensWon).toBe(10000n)
    })

    it('SPEC: getTopN() - returns limited results', () => {
      const top2 = getTopN(mockData, 2, 'desc')

      expect(top2.length).toBe(2)
      expect(top2[0].tokensWon).toBe(10000n)
      expect(top2[1].tokensWon).toBe(5000n)
    })

    it('SPEC: getTopN() - handles limit larger than data', () => {
      const top10 = getTopN(mockData, 10, 'desc')

      expect(top10.length).toBe(3)
    })

    it('SPEC: sortLeaderboard() - maintains player-token association', () => {
      const sorted = sortLeaderboard(mockData)

      // Player with 10000n should be first
      expect(sorted[0].player).toBe('0x2222222222222222222222222222222222222222')
      expect(sorted[0].tokensWon).toBe(10000n)
    })
  })

  describe('Specification: Cycle Information Queries', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getCycleDuration() - returns cycle duration in seconds', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(604800n) // 1 week

      const duration = await operations.getCycleDuration()

      expect(duration).toBe(604800n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getCycleDuration',
        }),
      )
    })

    it('SPEC: getCyclePlayerCount() - returns number of players', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(50n)

      const count = await operations.getCyclePlayerCount(1n)

      expect(count).toBe(50n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getCyclePlayerCount',
          args: [1n],
        }),
      )
    })

    it('SPEC: getCycleTokenCount() - returns number of tokens', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(3n)

      const count = await operations.getCycleTokenCount(1n)

      expect(count).toBe(3n)
    })

    it('SPEC: getCyclePlayers() - returns array of player addresses', async () => {
      const mockPlayers = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ]
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockPlayers)

      const players = await operations.getCyclePlayers(1n)

      expect(players).toEqual(mockPlayers)
    })

    it('SPEC: getCycleTokens() - returns array of token addresses', async () => {
      const mockTokens = [
        '0x0000000000000000000000000000000000000000',
        '0x3333333333333333333333333333333333333333',
      ]
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockTokens)

      const tokens = await operations.getCycleTokens(1n)

      expect(tokens).toEqual(mockTokens)
    })
  })

  describe('Specification: System Configuration Queries', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getOldestCycleId() - returns oldest cycle ID', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(0n)

      const oldestId = await operations.getOldestCycleId()

      expect(oldestId).toBe(0n)
    })

    it('SPEC: getScoreContract() - returns score contract address', async () => {
      const scoreAddress = '0x4444444444444444444444444444444444444444'
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(scoreAddress)

      const address = await operations.getScoreContract()

      expect(address).toBe(scoreAddress)
    })

    it('SPEC: getMaxCyclesKept() - returns max cycles configuration', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(52n)

      const maxCycles = await operations.getMaxCyclesKept()

      expect(maxCycles).toBe(52n)
    })

    it('SPEC: getConstants() - returns all contract constants', async () => {
      vi.spyOn(publicClient, 'readContract')
        .mockResolvedValueOnce(604800n) // DEFAULT_CYCLE_DURATION
        .mockResolvedValueOnce(3600n) // MIN_CYCLE_DURATION
        .mockResolvedValueOnce(2678400n) // MAX_CYCLE_DURATION
        .mockResolvedValueOnce(100n) // MAX_LEADERBOARD_SIZE
        .mockResolvedValueOnce(1000n) // MAX_PLAYERS_PER_CYCLE
        .mockResolvedValueOnce(10n) // MAX_TOKENS_PER_CYCLE
        .mockResolvedValueOnce(10n) // TOP_PLAYERS_COUNT
        .mockResolvedValueOnce(52n) // DEFAULT_MAX_CYCLES_KEPT
        .mockResolvedValueOnce(4n) // MIN_CYCLES_KEPT

      const constants = await operations.getConstants()

      expect(constants).toEqual({
        defaultCycleDuration: 604800n,
        minCycleDuration: 3600n,
        maxCycleDuration: 2678400n,
        maxLeaderboardSize: 100n,
        maxPlayersPerCycle: 1000n,
        maxTokensPerCycle: 10n,
        topPlayersCount: 10n,
        defaultMaxCyclesKept: 52n,
        minCyclesKept: 4n,
      })
    })
  })

  describe('Specification: Read-Only Nature', () => {
    it('SPEC: client league operations are read-only - no write methods exist', () => {
      const publicClient = createMockPublicClient()
      const operations = createClientLeagueOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      // Verify no write methods are present on client operations
      expect(operations).not.toHaveProperty('finalizeCycle')
      expect(operations).not.toHaveProperty('setScoreContract')
      expect(operations).not.toHaveProperty('setPrediction')
      expect(operations).not.toHaveProperty('setCycleDuration')
      expect(operations).not.toHaveProperty('setMaxCyclesKept')
      expect(operations).not.toHaveProperty('cleanupCycle')
    })

    it('SPEC: league operations do not require walletClient', () => {
      const publicClient = createMockPublicClient()

      // Should not throw - only publicClient is needed
      expect(() => {
        createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
      }).not.toThrow()
    })
  })

  describe('Specification: Error Handling', () => {
    let operations: LeagueOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientLeagueOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: gracefully handles contract call failures', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Contract execution reverted'),
      )

      await expect(operations.getCurrentCycleId()).rejects.toThrow(
        'Contract execution reverted',
      )
    })

    it('SPEC: handles invalid cycle ID', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('InvalidCycleId'),
      )

      await expect(operations.getCycle(999n)).rejects.toThrow()
    })

    it('SPEC: handles network errors', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Network request failed'),
      )

      await expect(operations.getCycleDuration()).rejects.toThrow(
        'Network request failed',
      )
    })
  })

  describe('Specification: CycleStatus Enum', () => {
    it('SPEC: CycleStatus enum has correct values', () => {
      expect(CycleStatus.Registration).toBe(0)
      expect(CycleStatus.Active).toBe(1)
      expect(CycleStatus.Finalized).toBe(2)
    })
  })
})
