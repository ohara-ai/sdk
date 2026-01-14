/**
 * Prediction Operations Specification Tests
 *
 * Tests the core prediction primitive operations following behavioral specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createClientPredictionOperations,
  createOperations,
  CompetitionType,
} from './prediction'
import type { PredictionOperations, Market, MarketSummary } from './prediction'
import { createMockPublicClient } from '../../__tests__/mocks/clients'
import { assertHasOperations } from '../../__tests__/utils/assertions'
import { zeroAddress, keccak256, encodePacked } from 'viem'

/**
 * Mock market data
 */
function createMockMarket(resolved: boolean = false): Market {
  return {
    competitionType: CompetitionType.Match,
    competitionId: 1n,
    token: zeroAddress,
    totalPool: 10000000000000000000n,
    bettingClosed: false,
    resolved,
    voided: false,
    resolvedWinner: zeroAddress,
  }
}

/**
 * Mock market summary data as array (matches contract return)
 */
function createMockMarketSummaryTuple() {
  return [
    CompetitionType.Match, // competitionType
    1n, // competitionId
    10000000000000000000n, // totalPool
    5n, // predictorCount
    3n, // uniquePlayersCount
    true, // bettingOpen
    false, // resolved
    zeroAddress, // resolvedWinner
  ] as const
}

/**
 * Mock prediction data
 */
function createMockPrediction() {
  return {
    predictedPlayer: '0x1111111111111111111111111111111111111111' as const,
    amount: 1000000000000000000n,
    claimed: false,
  }
}

describe('Prediction Operations - Specification Tests', () => {
  const CONTRACT_ADDRESS = '0x9876543210987654321098765432109876543210' as const
  const PREDICTOR_ADDRESS = '0x1111111111111111111111111111111111111111' as const
  const PLAYER_ADDRESS = '0x2222222222222222222222222222222222222222' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createClientPredictionOperations - creates operations with all methods', () => {
      const publicClient = createMockPublicClient()

      const operations = createClientPredictionOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )

      assertHasOperations(operations, [
        'getMarket',
        'getMarketSummary',
        'isBettingOpen',
        'getPrediction',
        'getStakeForPlayer',
        'getOddsForPlayer',
        'getAllOdds',
        'getPredictedPlayers',
        'getPredictors',
        'getCommit',
        'isPredictionCorrect',
        'getPotentialPayout',
        'getNextMarketId',
        'generateCommitHash',
      ])
    })

    it('SPEC: createOperations - returns read-only operations without wallet', () => {
      const publicClient = createMockPublicClient()

      const operations = createOperations(CONTRACT_ADDRESS, publicClient)

      expect(operations).toBeDefined()
      expect(typeof operations.getMarket).toBe('function')
      expect(typeof operations.getMarketSummary).toBe('function')
    })

    it('SPEC: createOperations - throws without publicClient', () => {
      expect(() =>
        createOperations(CONTRACT_ADDRESS, undefined as any),
      ).toThrow('PublicClient is required')
    })
  })

  describe('Specification: Read Operations', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>
    let operations: PredictionOperations

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientPredictionOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getMarket - returns market data for valid market ID', async () => {
      const mockMarket = createMockMarket()
      publicClient.readContract.mockResolvedValueOnce(mockMarket)

      const result = await operations.getMarket(1n)

      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: CONTRACT_ADDRESS,
        abi: expect.any(Array),
        functionName: 'getMarket',
        args: [1n],
      })
      expect(result.competitionType).toBe(CompetitionType.Match)
      expect(result.totalPool).toBe(mockMarket.totalPool)
    })

    it('SPEC: getMarketSummary - returns summary with all fields', async () => {
      const mockSummaryTuple = createMockMarketSummaryTuple()
      publicClient.readContract.mockResolvedValueOnce(mockSummaryTuple)

      const result = await operations.getMarketSummary(1n)

      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: CONTRACT_ADDRESS,
        abi: expect.any(Array),
        functionName: 'getMarketSummary',
        args: [1n],
      })
      expect(result.predictorCount).toBe(5n)
      expect(result.uniquePlayersCount).toBe(3n)
    })

    it('SPEC: isBettingOpen - returns true when betting is open', async () => {
      publicClient.readContract.mockResolvedValueOnce(true)

      const result = await operations.isBettingOpen(1n)

      expect(result).toBe(true)
      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: CONTRACT_ADDRESS,
        abi: expect.any(Array),
        functionName: 'isBettingOpen',
        args: [1n],
      })
    })

    it('SPEC: getPrediction - returns prediction data for predictor', async () => {
      const mockPrediction = createMockPrediction()
      publicClient.readContract.mockResolvedValueOnce(mockPrediction)

      const result = await operations.getPrediction(1n, PREDICTOR_ADDRESS)

      expect(publicClient.readContract).toHaveBeenCalledWith({
        address: CONTRACT_ADDRESS,
        abi: expect.any(Array),
        functionName: 'getPrediction',
        args: [1n, PREDICTOR_ADDRESS],
      })
      expect(result.amount).toBe(mockPrediction.amount)
    })

    it('SPEC: getStakeForPlayer - returns total staked on player', async () => {
      const expectedStake = 5000000000000000000n
      publicClient.readContract.mockResolvedValueOnce(expectedStake)

      const result = await operations.getStakeForPlayer(1n, PLAYER_ADDRESS)

      expect(result).toBe(expectedStake)
    })

    it('SPEC: getOddsForPlayer - returns odds in basis points', async () => {
      const expectedOdds = 15000n // 1.5x
      publicClient.readContract.mockResolvedValueOnce(expectedOdds)

      const result = await operations.getOddsForPlayer(1n, PLAYER_ADDRESS)

      expect(result).toBe(expectedOdds)
    })

    it('SPEC: getPredictedPlayers - returns array of player addresses', async () => {
      const expectedPlayers = [PLAYER_ADDRESS, PREDICTOR_ADDRESS]
      publicClient.readContract.mockResolvedValueOnce(expectedPlayers)

      const result = await operations.getPredictedPlayers(1n)

      expect(result).toEqual(expectedPlayers)
    })

    it('SPEC: getPredictors - returns array of predictor addresses', async () => {
      const expectedPredictors = [PREDICTOR_ADDRESS]
      publicClient.readContract.mockResolvedValueOnce(expectedPredictors)

      const result = await operations.getPredictors(1n)

      expect(result).toEqual(expectedPredictors)
    })

    it('SPEC: getNextMarketId - returns next available market ID', async () => {
      const expectedId = 5n
      publicClient.readContract.mockResolvedValueOnce(expectedId)

      const result = await operations.getNextMarketId()

      expect(result).toBe(expectedId)
    })

    it('SPEC: generateCommitHash - generates deterministic hash', () => {
      const salt = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const

      const hash1 = operations.generateCommitHash(PLAYER_ADDRESS, salt)
      const hash2 = operations.generateCommitHash(PLAYER_ADDRESS, salt)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/)
    })

    it('SPEC: generateCommitHash - different inputs produce different hashes', () => {
      const salt1 = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const
      const salt2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

      const hash1 = operations.generateCommitHash(PLAYER_ADDRESS, salt1)
      const hash2 = operations.generateCommitHash(PLAYER_ADDRESS, salt2)

      expect(hash1).not.toBe(hash2)
    })

    it('SPEC: isPredictionCorrect - returns true for correct prediction', async () => {
      publicClient.readContract.mockResolvedValueOnce(true)

      const result = await operations.isPredictionCorrect(1n, PREDICTOR_ADDRESS)

      expect(result).toBe(true)
    })

    it('SPEC: getPotentialPayout - returns expected payout amount', async () => {
      const expectedPayout = 2000000000000000000n
      publicClient.readContract.mockResolvedValueOnce(expectedPayout)

      const result = await operations.getPotentialPayout(1n, PREDICTOR_ADDRESS)

      expect(result).toBe(expectedPayout)
    })
  })

  describe('Specification: Competition Types', () => {
    it('SPEC: CompetitionType enum has correct values', () => {
      expect(CompetitionType.Match).toBe(0)
      expect(CompetitionType.Tournament).toBe(1)
      expect(CompetitionType.LeagueCycle).toBe(2)
    })
  })

  describe('Specification: Market States', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>
    let operations: PredictionOperations

    beforeEach(() => {
      publicClient = createMockPublicClient()
      operations = createClientPredictionOperations(
        CONTRACT_ADDRESS,
        publicClient,
      )
    })

    it('SPEC: getMarket - handles open market correctly', async () => {
      const openMarket = createMockMarket(false)
      openMarket.bettingClosed = false
      publicClient.readContract.mockResolvedValueOnce(openMarket)

      const result = await operations.getMarket(1n)

      expect(result.bettingClosed).toBe(false)
      expect(result.resolved).toBe(false)
    })

    it('SPEC: getMarket - handles resolved market correctly', async () => {
      const resolvedMarket = createMockMarket(true)
      resolvedMarket.bettingClosed = true
      resolvedMarket.resolvedWinner = PLAYER_ADDRESS
      publicClient.readContract.mockResolvedValueOnce(resolvedMarket)

      const result = await operations.getMarket(1n)

      expect(result.resolved).toBe(true)
      expect(result.resolvedWinner).toBe(PLAYER_ADDRESS)
    })

    it('SPEC: getMarket - handles voided market correctly', async () => {
      const voidedMarket = createMockMarket()
      voidedMarket.voided = true
      publicClient.readContract.mockResolvedValueOnce(voidedMarket)

      const result = await operations.getMarket(1n)

      expect(result.voided).toBe(true)
    })
  })
})
