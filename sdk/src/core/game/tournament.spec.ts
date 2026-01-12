/**
 * Tournament Operations Specification Tests
 *
 * Tests the core tournament primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createClientTournamentOperations,
  TournamentStatus,
} from './tournament'
import type { TournamentOperations } from './tournament'
import { createMockPublicClient } from '../../__tests__/mocks/clients'
import { assertHasOperations } from '../../__tests__/utils/assertions'

describe('Tournament Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS =
    '0x9876543210987654321098765432109876543210' as const
  const PLAYER_1 = '0x1111111111111111111111111111111111111111' as const
  const PLAYER_2 = '0x2222222222222222222222222222222222222222' as const

  const createMockTournamentView = () => ({
    participantCount: 4n,
    currentRound: 0n,
    totalRounds: 2n,
    status: TournamentStatus.Active,
    winner: '0x0000000000000000000000000000000000000000' as const,
    createdAt: BigInt(Date.now()),
  })

  const createMockBracketMatch = () => ({
    player1: PLAYER_1,
    player2: PLAYER_2,
    winner: '0x0000000000000000000000000000000000000000' as const,
    resolved: false,
  })

  describe('Specification: Factory Function', () => {
    it('SPEC: createClientTournamentOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()

      const operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      assertHasOperations(operations, [
        'getTournament',
        'getParticipants',
        'getBracketMatch',
        'getRoundMatches',
        'hasPendingMatch',
        'getActiveTournamentCount',
        'getScoreContract',
        'getMaxActiveTournaments',
        'getMaxParticipants',
      ])
    })

    it('SPEC: throws error when publicClient is missing', () => {
      expect(() => {
        createClientTournamentOperations(CONTRACT_ADDRESS, null as any)
      }).toThrow('PublicClient is required for tournament operations')
    })
  })

  describe('Specification: Tournament Queries', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockTournamentView(),
      )
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getTournament() - returns complete tournament view object', async () => {
      const tournament = await operations.getTournament(0n)

      expect(tournament).toEqual({
        participantCount: 4n,
        currentRound: 0n,
        totalRounds: 2n,
        status: TournamentStatus.Active,
        winner: expect.any(String),
        createdAt: expect.any(BigInt),
      })
    })

    it('SPEC: getTournament() - calls contract with correct parameters', async () => {
      await operations.getTournament(5n)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getTournament',
          args: [5n],
        }),
      )
    })

    it('SPEC: getTournament() - handles pending tournament', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue({
        participantCount: 8n,
        currentRound: 0n,
        totalRounds: 3n,
        status: TournamentStatus.Pending,
        winner: '0x0000000000000000000000000000000000000000',
        createdAt: BigInt(Date.now()),
      })

      const tournament = await operations.getTournament(0n)

      expect(tournament.status).toBe(TournamentStatus.Pending)
    })

    it('SPEC: getTournament() - handles finalized tournament', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue({
        participantCount: 4n,
        currentRound: 2n,
        totalRounds: 2n,
        status: TournamentStatus.Finalized,
        winner: PLAYER_1,
        createdAt: BigInt(Date.now()),
      })

      const tournament = await operations.getTournament(0n)

      expect(tournament.status).toBe(TournamentStatus.Finalized)
      expect(tournament.winner).toBe(PLAYER_1)
    })
  })

  describe('Specification: Participant Queries', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getParticipants() - returns array of participant addresses', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        PLAYER_1,
        PLAYER_2,
      ])

      const participants = await operations.getParticipants(0n)

      expect(participants).toEqual([PLAYER_1, PLAYER_2])
    })

    it('SPEC: getParticipants() - calls contract with correct parameters', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([])

      await operations.getParticipants(3n)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getParticipants',
          args: [3n],
        }),
      )
    })
  })

  describe('Specification: Bracket Match Queries', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getBracketMatch() - returns bracket match object', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockBracketMatch(),
      )

      const match = await operations.getBracketMatch(0n, 0n, 0n)

      expect(match).toEqual({
        player1: PLAYER_1,
        player2: PLAYER_2,
        winner: expect.any(String),
        resolved: false,
      })
    })

    it('SPEC: getBracketMatch() - calls contract with correct parameters', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        createMockBracketMatch(),
      )

      await operations.getBracketMatch(1n, 2n, 3n)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getBracketMatch',
          args: [1n, 2n, 3n],
        }),
      )
    })

    it('SPEC: getRoundMatches() - returns array of bracket matches', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        createMockBracketMatch(),
        createMockBracketMatch(),
      ])

      const matches = await operations.getRoundMatches(0n, 0n)

      expect(matches.length).toBe(2)
      expect(matches[0]).toHaveProperty('player1')
      expect(matches[0]).toHaveProperty('player2')
      expect(matches[0]).toHaveProperty('resolved')
    })

    it('SPEC: getRoundMatches() - handles empty round', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([])

      const matches = await operations.getRoundMatches(0n, 5n)

      expect(matches).toEqual([])
    })
  })

  describe('Specification: Pending Match Queries', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: hasPendingMatch() - returns pending match result', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([true, 0n, 1n])

      const result = await operations.hasPendingMatch(0n, PLAYER_1, PLAYER_2)

      expect(result).toEqual({
        exists: true,
        round: 0n,
        matchIndex: 1n,
      })
    })

    it('SPEC: hasPendingMatch() - handles no pending match', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([false, 0n, 0n])

      const result = await operations.hasPendingMatch(0n, PLAYER_1, PLAYER_2)

      expect(result.exists).toBe(false)
    })
  })

  describe('Specification: System Statistics', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getActiveTournamentCount() - returns count', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(5n)

      const count = await operations.getActiveTournamentCount()

      expect(count).toBe(5n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getActiveTournamentCount',
          args: [],
        }),
      )
    })

    it('SPEC: getScoreContract() - returns score contract address', async () => {
      const scoreAddress =
        '0x3333333333333333333333333333333333333333' as const
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(scoreAddress)

      const address = await operations.getScoreContract()

      expect(address).toBe(scoreAddress)
    })

    it('SPEC: getMaxActiveTournaments() - returns max limit', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(100n)

      const max = await operations.getMaxActiveTournaments()

      expect(max).toBe(100n)
    })

    it('SPEC: getMaxParticipants() - returns max participants limit', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(64n)

      const max = await operations.getMaxParticipants()

      expect(max).toBe(64n)
    })
  })

  describe('Specification: Read-Only Nature', () => {
    it('SPEC: client tournament operations are read-only - no write methods exist', () => {
      const publicClient = createMockPublicClient()
      const operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      expect(operations).not.toHaveProperty('createTournament')
      expect(operations).not.toHaveProperty('activate')
      expect(operations).not.toHaveProperty('resolveMatch')
      expect(operations).not.toHaveProperty('cancel')
    })

    it('SPEC: tournament operations do not require walletClient', () => {
      const publicClient = createMockPublicClient()

      expect(() => {
        createClientTournamentOperations(CONTRACT_ADDRESS, publicClient)
      }).not.toThrow()
    })
  })

  describe('Specification: Error Handling', () => {
    let operations: TournamentOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientTournamentOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: gracefully handles contract call failures', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Contract execution reverted'),
      )

      await expect(operations.getTournament(0n)).rejects.toThrow(
        'Contract execution reverted',
      )
    })

    it('SPEC: handles network errors', async () => {
      vi.spyOn(publicClient, 'readContract').mockRejectedValue(
        new Error('Network request failed'),
      )

      await expect(operations.getActiveTournamentCount()).rejects.toThrow(
        'Network request failed',
      )
    })
  })

  describe('Specification: Tournament Status Enum', () => {
    it('SPEC: TournamentStatus enum has correct values', () => {
      expect(TournamentStatus.Pending).toBe(0)
      expect(TournamentStatus.Active).toBe(1)
      expect(TournamentStatus.Finalized).toBe(2)
      expect(TournamentStatus.Cancelled).toBe(3)
    })
  })
})
