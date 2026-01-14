/**
 * Heap Operations Specification Tests
 *
 * Tests the core heap primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createClientHeapOperations,
  createOperations,
  HeapStatus,
} from './heap'
import type { HeapOperations, Heap, HeapConfig } from './heap'
import { createMockPublicClient } from '../../__tests__/mocks/clients'
import { assertHasOperations } from '../../__tests__/utils/assertions'
import { zeroAddress } from 'viem'

/**
 * Mock heap data as tuple (matches contract return)
 */
function createMockHeapTuple(status: HeapStatus = HeapStatus.Open) {
  return [
    zeroAddress, // token
    1000000000000000000n, // contributionAmount
    10n, // maxContributions
    [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ], // contributors
    status, // status
    zeroAddress, // winner
    BigInt(Date.now()), // createdAt
  ] as const
}

/**
 * Mock heap config
 */
function createMockHeapConfig(): HeapConfig {
  return {
    token: zeroAddress,
    contributionAmount: 1000000000000000000n,
    maxContributions: 10,
  }
}

describe('Heap Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210' as const
  const CONTRIBUTOR_ADDRESS = '0x1111111111111111111111111111111111111111' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createClientHeapOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()

      const operations = createClientHeapOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      assertHasOperations(operations, [
        'create',
        'contribute',
        'withdraw',
        'get',
        'getActiveHeaps',
        'getActiveHeapCount',
        'getMaxActiveHeaps',
        'getFeeConfiguration',
      ])
    })

    it('SPEC: createOperations - returns operations without wallet', () => {
      const publicClient = createMockPublicClient()

      const operations = createOperations(CONTRACT_ADDRESS, publicClient)

      expect(operations).toBeDefined()
      expect(typeof operations.get).toBe('function')
    })

    it('SPEC: createOperations - throws without publicClient', () => {
      expect(() =>
        createOperations(CONTRACT_ADDRESS, undefined as any),
      ).toThrow('PublicClient is required')
    })
  })

  describe('Specification: Read Operations', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>
    let operations: HeapOperations

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientHeapOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: get - returns heap data for valid heap ID', async () => {
      const mockHeapTuple = createMockHeapTuple()
      publicClient.readContract.mockResolvedValueOnce(mockHeapTuple)

      const result = await operations.get(1n)

      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: CONTRACT_ADDRESS,
        abi: expect.any(Array),
        functionName: 'getHeap',
        args: [1n],
      })
      expect(result.id).toBe(1n)
      expect(result.status).toBe(HeapStatus.Open)
    })

    it('SPEC: getActiveHeaps - returns array of active heap IDs', async () => {
      const expectedHeapIds = [1n, 2n, 3n]
      publicClient.readContract.mockResolvedValueOnce(expectedHeapIds)

      const result = await operations.getActiveHeaps(0, 10)

      expect(result).toEqual(expectedHeapIds)
    })

    it('SPEC: getActiveHeapCount - returns count of active heaps', async () => {
      const expectedCount = 5n
      publicClient.readContract.mockResolvedValueOnce(expectedCount)

      const result = await operations.getActiveHeapCount()

      expect(result).toBe(expectedCount)
    })

    it('SPEC: getMaxActiveHeaps - returns maximum allowed active heaps', async () => {
      const expectedMax = 100n
      publicClient.readContract.mockResolvedValueOnce(expectedMax)

      const result = await operations.getMaxActiveHeaps()

      expect(result).toBe(expectedMax)
    })

    it('SPEC: getFeeConfiguration - returns fee config with recipients and shares', async () => {
      const mockFeeConfig = {
        recipients: [CONTRIBUTOR_ADDRESS],
        shares: [1000n],
        totalShare: 1000n,
      }
      publicClient.readContract.mockResolvedValueOnce([
        mockFeeConfig.recipients,
        mockFeeConfig.shares,
        mockFeeConfig.totalShare,
      ])

      const result = await operations.getFeeConfiguration()

      expect(result).toBeDefined()
    })
  })

  describe('Specification: Heap Status', () => {
    it('SPEC: HeapStatus enum has correct values', () => {
      expect(HeapStatus.Open).toBe(0)
      expect(HeapStatus.Active).toBe(1)
      expect(HeapStatus.Finalized).toBe(2)
      expect(HeapStatus.Cancelled).toBe(3)
    })
  })

  describe('Specification: Heap States', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>
    let operations: HeapOperations

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientHeapOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: get - handles open heap correctly', async () => {
      const openHeapTuple = createMockHeapTuple(HeapStatus.Open)
      publicClient.readContract.mockResolvedValueOnce(openHeapTuple)

      const result = await operations.get(1n)

      expect(result.status).toBe(HeapStatus.Open)
    })

    it('SPEC: get - handles active heap correctly', async () => {
      const activeHeapTuple = createMockHeapTuple(HeapStatus.Active)
      publicClient.readContract.mockResolvedValueOnce(activeHeapTuple)

      const result = await operations.get(1n)

      expect(result.status).toBe(HeapStatus.Active)
    })

    it('SPEC: get - handles finalized heap with winner', async () => {
      const finalizedHeapTuple = [
        zeroAddress,
        1000000000000000000n,
        10n,
        ['0x1111111111111111111111111111111111111111'],
        HeapStatus.Finalized,
        CONTRIBUTOR_ADDRESS, // winner
        BigInt(Date.now()),
      ] as const
      publicClient.readContract.mockResolvedValueOnce(finalizedHeapTuple)

      const result = await operations.get(1n)

      expect(result.status).toBe(HeapStatus.Finalized)
      expect(result.winner).toBe(CONTRIBUTOR_ADDRESS)
    })

    it('SPEC: get - handles cancelled heap correctly', async () => {
      const cancelledHeapTuple = createMockHeapTuple(HeapStatus.Cancelled)
      publicClient.readContract.mockResolvedValueOnce(cancelledHeapTuple)

      const result = await operations.get(1n)

      expect(result.status).toBe(HeapStatus.Cancelled)
    })
  })

  describe('Specification: Heap Configuration', () => {
    it('SPEC: HeapConfig has required fields', () => {
      const config = createMockHeapConfig()

      expect(config.token).toBeDefined()
      expect(config.contributionAmount).toBeDefined()
      expect(config.maxContributions).toBeDefined()
    })
  })
})
