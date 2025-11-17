/**
 * Score Operations Specification Tests
 * 
 * Tests the core score primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClientScoreOperations } from './scores'
import type { ScoreOperations } from './scores'
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

      const operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)

      assertHasOperations(operations, [
        'getPlayerScore',
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
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockPlayerScore())
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
        })
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

    it('SPEC: getTopPlayersByWins() - returns top players sorted by wins', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockTopPlayers())

      const result = await operations.getTopPlayersByWins(10)

      expect(result).toEqual({
        players: [
          '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222',
        ],
        wins: [10n, 5n],
        prizes: [20000000000000000000n, 10000000000000000000n],
      })
    })

    it('SPEC: getTopPlayersByWins() - calls contract with limit parameter', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockTopPlayers())

      await operations.getTopPlayersByWins(5)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getTopPlayersByWins',
          args: [5n],
        })
      )
    })

    it('SPEC: getTopPlayersByWins() - converts number limit to BigInt', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockTopPlayers())

      await operations.getTopPlayersByWins(25)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [25n],
        })
      )
    })

    it('SPEC: getTopPlayersByPrize() - returns top players sorted by prize', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockTopPlayers())

      const result = await operations.getTopPlayersByPrize(10)

      expect(result).toEqual({
        players: expect.any(Array),
        wins: expect.any(Array),
        prizes: expect.any(Array),
      })
      
      // Verify arrays have same length
      expect(result.players.length).toBe(result.wins.length)
      expect(result.players.length).toBe(result.prizes.length)
    })

    it('SPEC: getTopPlayersByPrize() - calls contract with correct function name', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockTopPlayers())

      await operations.getTopPlayersByPrize(10)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getTopPlayersByPrize',
          args: [10n],
        })
      )
    })

    it('SPEC: leaderboard queries handle empty results', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([[], [], []])

      const result = await operations.getTopPlayersByWins(10)

      expect(result.players).toEqual([])
      expect(result.wins).toEqual([])
      expect(result.prizes).toEqual([])
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
        })
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
        })
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
        })
      )
    })

    it('SPEC: getMaxTotalPlayers() - returns maximum total players allowed', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(10000n)

      const max = await operations.getMaxTotalPlayers()

      expect(max).toBe(10000n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxTotalPlayers',
        })
      )
    })

    it('SPEC: getMaxTotalMatches() - returns maximum total matches allowed', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(100000n)

      const max = await operations.getMaxTotalMatches()

      expect(max).toBe(100000n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxTotalMatches',
        })
      )
    })
  })

  describe('Specification: Read-Only Nature', () => {
    it('SPEC: score operations are read-only - no write methods exist', () => {
      const publicClient = createMockPublicClient()
      const operations = createClientScoreOperations(CONTRACT_ADDRESS, publicClient)

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
        new Error('Contract execution reverted')
      )

      await expect(operations.getPlayerScore(PLAYER_ADDRESS)).rejects.toThrow(
        'Contract execution reverted'
      )
    })

    it('SPEC: handles invalid player addresses', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Invalid address format')
      )

      await expect(operations.getPlayerScore('invalid' as any)).rejects.toThrow()
    })

    it('SPEC: handles network errors', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Network request failed')
      )

      await expect(operations.getTotalPlayers()).rejects.toThrow('Network request failed')
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
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockPlayerScore())

      const score = await operations.getPlayerScore(PLAYER_ADDRESS)

      expect(score.player).toBe(PLAYER_ADDRESS)
    })
  })
})
