/**
 * Score Operations Specification Tests
 *
 * Tests the core score primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClientScoreOperations, sortPlayers, getTopN } from './scores'
import type { ScoreOperations, PlayersResult } from './scores'
import {
  createMockPublicClient,
  createMockPlayerScore,
  createMockTopPlayers,
} from '../../__tests__/mocks/clients'
import { assertHasOperations } from '../../__tests__/utils/assertions'

describe('Score Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210' as const
  const PLAYER_ADDRESS = '0x1111111111111111111111111111111111111111' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createScoreOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()

      const operations = createClientScoreOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      assertHasOperations(operations, [
        'getPlayerScore',
        'getPlayers',
        'getPlayersPaginated',
        'getTopPlayersByWins',
        'getTopPlayersByPrize',
        'getTotalPlayers',
        'getTotalMatches',
        'getMaxLosersPerMatch',
        'getMaxTotalPlayers',
        'getMaxTotalMatches',
      ])
    })

    it('SPEC: throws error when publicClient is missing', () => {
      expect(() => {
        createClientScoreOperations(CONTRACT_ADDRESS, null as any)
      }).toThrow('PublicClient is required for score operations')
    })
  })

  describe('Specification: Player Score Queries', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockPlayerScore(),
      )
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getPlayerScore() - returns complete player score object', async () => {
      const score = await operations.getPlayerScore(PLAYER_ADDRESS)

      expect(score).toEqual({
        player: PLAYER_ADDRESS,
        totalWins: 5n,
        totalPrize: 10000000000000000000n,
        lastMatchId: 3n,
        lastWinTimestamp: expect.any(BigInt),
      })
    })

    it('SPEC: getPlayerScore() - calls contract with correct parameters', async () => {
      await operations.getPlayerScore(PLAYER_ADDRESS)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getPlayerScore',
          args: [PLAYER_ADDRESS],
        }),
      )
    })

    it('SPEC: getPlayerScore() - handles player with no wins', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        0n, // totalWins
        0n, // totalPrize
        0n, // lastMatchId
        0n, // lastWinTimestamp
      ])

      const score = await operations.getPlayerScore(PLAYER_ADDRESS)

      expect(score.totalWins).toBe(0n)
      expect(score.totalPrize).toBe(0n)
      expect(score.lastMatchId).toBe(0n)
      expect(score.lastWinTimestamp).toBe(0n)
    })
  })

  describe('Specification: Leaderboard Queries', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getPlayers() - returns unsorted player data', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTopPlayers(),
      )

      const result = await operations.getPlayers(10)

      expect(result).toEqual({
        players: expect.any(Array),
        wins: expect.any(Array),
        prizes: expect.any(Array),
      })
      expect(result.players.length).toBe(result.wins.length)
      expect(result.players.length).toBe(result.prizes.length)
    })

    it('SPEC: getPlayers() - calls contract with correct function name', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTopPlayers(),
      )

      await operations.getPlayers(10)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getPlayers',
          args: [10n],
        }),
      )
    })

    it('SPEC: getPlayersPaginated() - calls contract with offset and limit', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTopPlayers(),
      )

      await operations.getPlayersPaginated(5, 10)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPlayersPaginated',
          args: [5n, 10n],
        }),
      )
    })

    it('SPEC: getTopPlayersByWins() - returns client-side sorted data', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTopPlayers(),
      )

      const result = await operations.getTopPlayersByWins(2)

      expect(result.players.length).toBeLessThanOrEqual(2)
      // Verify sorted in descending order by wins
      for (let i = 0; i < result.wins.length - 1; i++) {
        expect(result.wins[i]).toBeGreaterThanOrEqual(result.wins[i + 1])
      }
    })

    it('SPEC: getTopPlayersByPrize() - returns client-side sorted data', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTopPlayers(),
      )

      const result = await operations.getTopPlayersByPrize(2)

      expect(result.players.length).toBeLessThanOrEqual(2)
      // Verify sorted in descending order by prizes
      for (let i = 0; i < result.prizes.length - 1; i++) {
        expect(result.prizes[i]).toBeGreaterThanOrEqual(result.prizes[i + 1])
      }
    })

    it('SPEC: leaderboard queries handle empty results', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([[], [], []])

      const result = await operations.getPlayers(10)

      expect(result.players).toEqual([])
      expect(result.wins).toEqual([])
      expect(result.prizes).toEqual([])
    })
  })

  describe('Specification: Sorting Utilities', () => {
    const mockData: PlayersResult = {
      players: [
        '0x1111111111111111111111111111111111111111' as const,
        '0x2222222222222222222222222222222222222222' as const,
        '0x3333333333333333333333333333333333333333' as const,
      ],
      wins: [5n, 10n, 3n],
      prizes: [1000n, 500n, 2000n],
    }

    it('SPEC: sortPlayers() - sorts by wins descending by default', () => {
      const sorted = sortPlayers(mockData)

      expect(sorted[0].wins).toBe(10n)
      expect(sorted[1].wins).toBe(5n)
      expect(sorted[2].wins).toBe(3n)
    })

    it('SPEC: sortPlayers() - sorts by prize descending', () => {
      const sorted = sortPlayers(mockData, 'prize', 'desc')

      expect(sorted[0].prize).toBe(2000n)
      expect(sorted[1].prize).toBe(1000n)
      expect(sorted[2].prize).toBe(500n)
    })

    it('SPEC: sortPlayers() - sorts by wins ascending', () => {
      const sorted = sortPlayers(mockData, 'wins', 'asc')

      expect(sorted[0].wins).toBe(3n)
      expect(sorted[1].wins).toBe(5n)
      expect(sorted[2].wins).toBe(10n)
    })

    it('SPEC: getTopN() - returns limited results', () => {
      const top2 = getTopN(mockData, 2, 'wins', 'desc')

      expect(top2.length).toBe(2)
      expect(top2[0].wins).toBe(10n)
      expect(top2[1].wins).toBe(5n)
    })

    it('SPEC: getTopN() - handles limit larger than data', () => {
      const top10 = getTopN(mockData, 10, 'wins', 'desc')

      expect(top10.length).toBe(3)
    })
  })

  describe('Specification: System Statistics', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getTotalPlayers() - returns total number of players', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(150n)

      const total = await operations.getTotalPlayers()

      expect(total).toBe(150n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTotalPlayers',
          args: [],
        }),
      )
    })

    it('SPEC: getTotalMatches() - returns total number of matches', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(500n)

      const total = await operations.getTotalMatches()

      expect(total).toBe(500n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTotalMatches',
          args: [],
        }),
      )
    })

    it('SPEC: getTotalPlayers() - handles zero players', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(0n)

      const total = await operations.getTotalPlayers()

      expect(total).toBe(0n)
    })

    it('SPEC: getTotalMatches() - handles zero matches', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(0n)

      const total = await operations.getTotalMatches()

      expect(total).toBe(0n)
    })
  })

  describe('Specification: System Limits', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: getMaxLosersPerMatch() - returns maximum losers allowed', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(9n)

      const max = await operations.getMaxLosersPerMatch()

      expect(max).toBe(9n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxLosersPerMatch',
        }),
      )
    })

    it('SPEC: getMaxTotalPlayers() - returns maximum total players allowed', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(10000n)

      const max = await operations.getMaxTotalPlayers()

      expect(max).toBe(10000n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxTotalPlayers',
        }),
      )
    })

    it('SPEC: getMaxTotalMatches() - returns maximum total matches allowed', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(100000n)

      const max = await operations.getMaxTotalMatches()

      expect(max).toBe(100000n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxTotalMatches',
        }),
      )
    })
  })

  describe('Specification: Read-Only Nature', () => {
    it('SPEC: score operations are read-only - no write methods exist', () => {
      const publicClient = createMockPublicClient()
      const operations = createClientScoreOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      // Verify no write methods are present
      expect(operations).not.toHaveProperty('recordWin')
      expect(operations).not.toHaveProperty('recordLoss')
      expect(operations).not.toHaveProperty('updateScore')
      expect(operations).not.toHaveProperty('resetScore')
    })

    it('SPEC: score operations do not require walletClient', () => {
      const publicClient = createMockPublicClient()

      // Should not throw - only publicClient is needed
      expect(() => {
        createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
      }).not.toThrow()
    })
  })

  describe('Specification: Error Handling', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: gracefully handles contract call failures', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Contract execution reverted'),
      )

      await expect(operations.getPlayerScore(PLAYER_ADDRESS)).rejects.toThrow(
        'Contract execution reverted',
      )
    })

    it('SPEC: handles invalid player addresses', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Invalid address format'),
      )

      await expect(
        operations.getPlayerScore('invalid' as any),
      ).rejects.toThrow()
    })

    it('SPEC: handles network errors', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Network request failed'),
      )

      await expect(operations.getTotalPlayers()).rejects.toThrow(
        'Network request failed',
      )
    })
  })

  describe('Specification: Data Integrity', () => {
    let operations: ScoreOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)
    })

    it('SPEC: leaderboard data arrays maintain consistent lengths', async () => {
      const mockData = [
        ['0xAAA', '0xBBB', '0xCCC'],
        [10n, 5n, 3n],
        [1000n, 500n, 300n],
      ]
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockData)

      const result = await operations.getTopPlayersByWins(3)

      expect(result.players.length).toBe(3)
      expect(result.wins.length).toBe(3)
      expect(result.prizes.length).toBe(3)
    })

    it('SPEC: player score includes player address for verification', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockPlayerScore(),
      )

      const score = await operations.getPlayerScore(PLAYER_ADDRESS)

      expect(score.player).toBe(PLAYER_ADDRESS)
    })
  })
})
