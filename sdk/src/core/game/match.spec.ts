/**
 * Match Operations Specification Tests
 * 
 * Tests the core match primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClientMatchOperations, createOperations, MatchStatus } from './match'
import type { MatchOperations, ServerMatchOperations } from './match'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockMatchData,
  createMockFeeConfig,
} from '../../__tests__/mocks/clients'
import { assertHasOperations, assertValidHash } from '../../__tests__/utils/assertions'

describe('Match Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const
  const PLAYER_ADDRESS = '0x1111111111111111111111111111111111111111' as const

  describe('Specification: Factory Functions', () => {
    it('SPEC: createClientMatchOperations - creates client operations without server methods', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)

      // Verify client operations are present
      assertHasOperations(operations, [
        'create',
        'join',
        'leave',
        'get',
        'getActiveMatches',
        'getActiveMatchCount',
        'getMaxActiveMatches',
        'getFeeConfiguration',
        'getPlayerStake',
        'getScoreboardAddress',
        'withdrawFees',
        'getPendingFees',
      ])

      // Verify server operations are NOT present
      expect(operations).not.toHaveProperty('activate')
      expect(operations).not.toHaveProperty('finalize')
    })

    it('SPEC: createOperations with walletClient - includes server operations', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const operations = createOperations(CONTRACT_ADDRESS, publicClient, walletClient)

      // Verify all operations are present
      assertHasOperations(operations, [
        'create',
        'join',
        'leave',
        'get',
        'getActiveMatches',
        'getActiveMatchCount',
        'getMaxActiveMatches',
        'getFeeConfiguration',
        'getPlayerStake',
        'getScoreboardAddress',
        'withdrawFees',
        'getPendingFees',
        'activate',
        'finalize',
      ])
    })

    it('SPEC: createOperations without walletClient - returns base operations', () => {
      const publicClient = createMockPublicClient()

      const operations = createOperations(CONTRACT_ADDRESS, publicClient)

      // Should have read operations
      assertHasOperations(operations, [
        'get',
        'getActiveMatches',
        'getActiveMatchCount',
        'getMaxActiveMatches',
        'getFeeConfiguration',
        'getPlayerStake',
      ])
    })

    it('SPEC: throws error when publicClient is missing', () => {
      expect(() => {
        createClientMatchOperations(CONTRACT_ADDRESS, null as any)
      }).toThrow('PublicClient is required for match operations')
    })
  })

  describe('Specification: Write Operations - Create Match', () => {
    let operations: MatchOperations
    let publicClient: ReturnType<typeof createMockPublicClient>
    let walletClient: ReturnType<typeof createMockWalletClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: create() - successfully creates match with native token (ETH)', async () => {
      const config = {
        token: '0x0000000000000000000000000000000000000000' as const,
        stakeAmount: 1000000000000000000n, // 1 ETH
        maxPlayers: 2,
      }

      const hash = await operations.create(config)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'create',
          args: [config.token, config.stakeAmount, 2n],
          value: config.stakeAmount, // Native token requires value
        })
      )
    })

    it('SPEC: create() - successfully creates match with ERC20 token', async () => {
      const config = {
        token: '0x9999999999999999999999999999999999999999' as const,
        stakeAmount: 1000000000000000000n,
        maxPlayers: 4,
      }

      const hash = await operations.create(config)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'create',
          args: [config.token, config.stakeAmount, 4n],
          value: 0n, // ERC20 doesn't require value
        })
      )
    })

    it('SPEC: create() - throws when wallet client is missing', async () => {
      const opsWithoutWallet = createClientMatchOperations(CONTRACT_ADDRESS, publicClient)
      
      await expect(
        opsWithoutWallet.create({
          token: '0x0000000000000000000000000000000000000000',
          stakeAmount: 1000000000000000000n,
          maxPlayers: 2,
        })
      ).rejects.toThrow('WalletClient is required for write operations')
    })

    it('SPEC: create() - throws when account is missing', async () => {
      const walletWithoutAccount = createMockWalletClient(PLAYER_ADDRESS, {
        account: undefined,
      })
      const opsWithBadWallet = createClientMatchOperations(
        CONTRACT_ADDRESS,
        publicClient,
        walletWithoutAccount
      )

      await expect(
        opsWithBadWallet.create({
          token: '0x0000000000000000000000000000000000000000',
          stakeAmount: 1000000000000000000n,
          maxPlayers: 2,
        })
      ).rejects.toThrow('No account found in wallet')
    })
  })

  describe('Specification: Write Operations - Join Match', () => {
    let operations: MatchOperations
    let publicClient: ReturnType<typeof createMockPublicClient>
    let walletClient: ReturnType<typeof createMockWalletClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(PLAYER_ADDRESS)
      
      // Mock get() to return match data for join() to read
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockMatchData())
      
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: join() - successfully joins match with native token', async () => {
      const matchId = 1n
      const hash = await operations.join(matchId)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'join',
          args: [matchId],
          value: 1000000000000000000n, // stake amount from mocked match
        })
      )
    })

    it('SPEC: join() - reads match data before joining to get stake amount', async () => {
      const matchId = 5n
      await operations.join(matchId)

      // Should call get() internally
      expect(publicClient.readContract).toHaveBeenCalled()
    })
  })

  describe('Specification: Write Operations - Withdraw', () => {
    let operations: MatchOperations
    let walletClient: ReturnType<typeof createMockWalletClient>

    beforeEach(() => {
      const publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: leave() - successfully leaves match and withdraws stake', async () => {
      const matchId = 1n
      const hash = await operations.leave(matchId)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'leave',
          args: [matchId],
        })
      )
    })
  })

  describe('Specification: Read Operations - Get Match', () => {
    let operations: MatchOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockMatchData())
      
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: get() - returns complete match object with all fields', async () => {
      const matchId = 1n
      const match = await operations.get(matchId)

      expect(match).toEqual({
        id: matchId,
        token: '0x0000000000000000000000000000000000000000',
        stakeAmount: 1000000000000000000n,
        maxPlayers: 2,
        players: ['0x1111111111111111111111111111111111111111'],
        status: MatchStatus.Open,
        winner: '0x0000000000000000000000000000000000000000',
        createdAt: expect.any(BigInt),
        totalPrize: 1000000000000000000n, // stakeAmount * players.length
      })
    })

    it('SPEC: get() - calculates totalPrize correctly', async () => {
      const matchData = createMockMatchData()
      matchData[3] = [PLAYER_ADDRESS, '0x2222222222222222222222222222222222222222'] // 2 players
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(matchData)

      const match = await operations.get(1n)

      expect(match.totalPrize).toBe(2000000000000000000n) // 1 ETH * 2 players
    })

    it('SPEC: get() - calls contract with correct parameters', async () => {
      const matchId = 42n
      await operations.get(matchId)

      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'getMatch',
          args: [matchId],
        })
      )
    })
  })

  describe('Specification: Read Operations - Active Matches', () => {
    let operations: MatchOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: getActiveMatches() - fetches all matches when no limit specified', async () => {
      vi.spyOn(publicClient, 'readContract')
        .mockResolvedValueOnce(5n) // getActiveMatchCount
        .mockResolvedValueOnce([1n, 2n, 3n, 4n, 5n]) // getActiveMatchIds

      const matches = await operations.getActiveMatches()

      expect(matches).toEqual([1n, 2n, 3n, 4n, 5n])
      expect(publicClient.readContract).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          functionName: 'getActiveMatchIds',
          args: [0n, 5n], // offset 0, limit from count
        })
      )
    })

    it('SPEC: getActiveMatches() - respects offset and limit parameters', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([3n, 4n])

      const matches = await operations.getActiveMatches(2, 2)

      expect(matches).toEqual([3n, 4n])
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getActiveMatchIds',
          args: [2n, 2n],
        })
      )
    })

    it('SPEC: getActiveMatchCount() - returns total active match count', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(10n)

      const count = await operations.getActiveMatchCount()

      expect(count).toBe(10n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getActiveMatchCount',
        })
      )
    })

    it('SPEC: getMaxActiveMatches() - returns maximum allowed active matches', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(100n)

      const max = await operations.getMaxActiveMatches()

      expect(max).toBe(100n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'maxActiveMatches',
        })
      )
    })
  })

  describe('Specification: Read Operations - Fee Configuration', () => {
    let operations: MatchOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockFeeConfig())
      
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: getFeeConfiguration() - returns fee configuration structure', async () => {
      const feeConfig = await operations.getFeeConfiguration()

      expect(feeConfig).toEqual({
        recipients: ['0x3333333333333333333333333333333333333333'],
        shares: [100n],
        totalShare: 10000n,
      })
    })

    it('SPEC: getPlayerStake() - returns player stake for a match', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(1000000000000000000n)

      const stake = await operations.getPlayerStake(1n, PLAYER_ADDRESS)

      expect(stake).toBe(1000000000000000000n)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getPlayerStake',
          args: [1n, PLAYER_ADDRESS],
        })
      )
    })

    it('SPEC: getScoreboardAddress() - returns the scoreboard contract address', async () => {
      const scoreboardAddress = '0x8888888888888888888888888888888888888888' as const
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(scoreboardAddress)

      const address = await operations.getScoreboardAddress()

      expect(address).toBe(scoreboardAddress)
      expect(publicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'score',
        })
      )
    })
  })

  describe('Specification: Server Operations', () => {
    let operations: ServerMatchOperations
    let walletClient: ReturnType<typeof createMockWalletClient>
    const CONTROLLER_ADDRESS = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as const

    beforeEach(() => {
      const publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(CONTROLLER_ADDRESS)
      operations = createOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: activate() - controller can activate a match', async () => {
      const matchId = 1n
      const hash = await operations.activate(matchId)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'activate',
          args: [matchId],
        })
      )
    })

    it('SPEC: finalize() - controller can finalize a match with winner', async () => {
      const matchId = 1n
      const winner = PLAYER_ADDRESS

      const hash = await operations.finalize(matchId, winner)

      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'finalize',
          args: [matchId, winner],
        })
      )
    })
  })

  describe('Specification: Error Handling', () => {
    it('SPEC: operations fail gracefully when wallet operations throw', async () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS, {
        writeContract: vi.fn().mockRejectedValue(new Error('User rejected transaction')),
      })
      const operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient, walletClient)

      await expect(
        operations.create({
          token: '0x0000000000000000000000000000000000000000',
          stakeAmount: 1000000000000000000n,
          maxPlayers: 2,
        })
      ).rejects.toThrow('User rejected transaction')
    })

    it('SPEC: read operations fail gracefully when contract call fails', async () => {
      const publicClient = createMockPublicClient({
        readContract: vi.fn().mockRejectedValue(new Error('Contract not found')),
      })
      const operations = createClientMatchOperations(CONTRACT_ADDRESS, publicClient)

      await expect(operations.get(1n)).rejects.toThrow('Contract not found')
    })
  })
})
