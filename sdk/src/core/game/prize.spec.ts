/**
 * Prize Operations Specification Tests
 *
 * Tests the core prize primitive operations following behavioral specifications
 * Updated for multi-winner support with token-based pools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClientPrizeOperations, DistributionStrategy } from './prize'
import type { PrizeOperations } from './prize'
import {
  createMockPublicClient,
  createMockWalletClient,
} from '../../__tests__/mocks/clients'
import {
  assertHasOperations,
  assertValidHash,
} from '../../__tests__/utils/assertions'

describe('Prize Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x5555555555555555555555555555555555555555' as const
  const PLAYER_ADDRESS = '0x1111111111111111111111111111111111111111' as const
  const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createClientPrizeOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const operations = createClientPrizeOperations(
        CONTRACT_ADDRESS,
        publicClient,
        walletClient,
      )

      assertHasOperations(operations, [
        'getCurrentPoolId',
        'getMatchesPerPool',
        'getWinnersCount',
        'getDistributionStrategy',
        'getPool',
        'getPoolWinners',
        'getPoolWins',
        'getPrizeForRank',
        'getTokens',
        'getClaimablePools',
        'claimPrize',
      ])
    })

    it('SPEC: throws error when publicClient is missing', () => {
      expect(() => {
        createClientPrizeOperations(CONTRACT_ADDRESS, null as any)
      }).toThrow('PublicClient is required for prize operations')
    })
  })

  describe('Specification: Read Operations', () => {
    let operations: PrizeOperations
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)
      operations = createClientPrizeOperations(CONTRACT_ADDRESS, publicClient, walletClient)
    })

    it('SPEC: getCurrentPoolId() - returns current pool id for token', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(3n)
      const id = await operations.getCurrentPoolId(NATIVE_TOKEN)
      expect(id).toBe(3n)
    })

    it('SPEC: getMatchesPerPool() - returns matches per pool', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(42n)
      const n = await operations.getMatchesPerPool()
      expect(n).toBe(42n)
    })

    it('SPEC: getPool() - returns structured pool object with token-based fields', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        NATIVE_TOKEN,
        10n,
        true,
        1000000000000000000n,
      ])

      const pool = await operations.getPool(1n)
      expect(pool).toEqual({
        token: NATIVE_TOKEN,
        matchesCompleted: 10n,
        finalized: true,
        prizeAmount: 1000000000000000000n,
      })
    })

    it('SPEC: getTokens() - returns list of tracked tokens', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        '0x0000000000000000000000000000000000000000',
        '0x9999999999999999999999999999999999999999',
      ])

      const tokens = await operations.getTokens()
      expect(tokens.length).toBe(2)
    })

    it('SPEC: getClaimablePools() - returns claimable pool ids', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([1n, 2n])
      const pools = await operations.getClaimablePools(PLAYER_ADDRESS)
      expect(pools).toEqual([1n, 2n])
    })
  })

  describe('Specification: Write Operations', () => {
    it('SPEC: claimPrize() - requires wallet client', async () => {
      const publicClient = createMockPublicClient()
      const ops = createClientPrizeOperations(CONTRACT_ADDRESS, publicClient)

      await expect(ops.claimPrize(1n)).rejects.toThrow(
        'WalletClient is required for write operations',
      )
    })

    it('SPEC: claimPrize() - sends transaction and returns hash', async () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)
      const ops = createClientPrizeOperations(
        CONTRACT_ADDRESS,
        publicClient,
        walletClient,
      )

      const hash = await ops.claimPrize(1n)
      assertValidHash(hash)
      expect(walletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CONTRACT_ADDRESS,
          functionName: 'claimPrize',
          args: [1n],
        }),
      )
    })

    it('SPEC: claimPrize() - throws when account is missing', async () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS, {
        account: undefined,
      })
      const ops = createClientPrizeOperations(
        CONTRACT_ADDRESS,
        publicClient,
        walletClient,
      )

      await expect(ops.claimPrize(1n)).rejects.toThrow('No account found in wallet')
    })
  })
})
