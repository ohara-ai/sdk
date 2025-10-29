/**
 * Deployment Integration Specification Tests
 * 
 * Tests the end-to-end deployment workflows
 * These tests verify the integration between deployment functions and blockchain interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployGameMatch } from './deployGameMatch'
import { deployGameScore } from './deployGameScore'

// Mock the dependencies
vi.mock('../storage/contractStorage', () => ({
  setContractAddress: vi.fn().mockResolvedValue(undefined),
  getControllerKey: vi.fn().mockResolvedValue('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  getControllerAddress: vi.fn().mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
}))

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
      account: {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      },
    })),
    createPublicClient: vi.fn(() => ({
      waitForTransactionReceipt: vi.fn().mockImplementation(() => {
        // Return appropriate logs based on which factory is being called
        return Promise.resolve({
          logs: [
            {
              address: '0x1234567890123456789012345678901234567890',
              topics: [
                '0xeventSignature',
                '0x000000000000000000000000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
              ],
            },
            {
              address: '0x9876543210987654321098765432109876543210',
              topics: [
                '0xeventSignature',
                '0x000000000000000000000000BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
              ],
            },
          ],
        })
      }),
      getChainId: vi.fn().mockResolvedValue(31337),
    })),
  }
})

describe('Deployment Integration - Specification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY = '0x1234567890123456789012345678901234567890'
    process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY = '0x9876543210987654321098765432109876543210'
    process.env.RPC_URL = 'http://localhost:8545'
    process.env.PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  })

  describe('Specification: Deploy GameMatch', () => {
    it('SPEC: deployGameMatch - successfully deploys with zero address', async () => {
      const result = await deployGameMatch({})

      expect(result.success).toBe(true)
      expect(result.address).toBeDefined()
      expect(result.transactionHash).toBeDefined()
    })

    it('SPEC: deployGameMatch - deploys with GameScore address', async () => {
      const result = await deployGameMatch({
        gameScoreAddress: '0x9876543210987654321098765432109876543210',
      })

      expect(result.success).toBe(true)
      expect(result.address).toBeDefined()
    })

    it('SPEC: deployGameMatch - handles fee configuration', async () => {
      const result = await deployGameMatch({
        feeRecipients: ['0x1111111111111111111111111111111111111111'],
        feeShares: ['100'],
      })

      expect(result.success).toBe(true)
    })

    it('SPEC: deployGameMatch - returns DeploymentResult structure', async () => {
      const result = await deployGameMatch({})

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('transactionHash')
      expect(result.success).toBe(true)
    })

    it('SPEC: deployGameMatch - can include authorization warnings', async () => {
      // Result may include optional warnings
      const result = await deployGameMatch({
        gameScoreAddress: '0x9876543210987654321098765432109876543210',
      })

      // authorizationWarning and authorizationError are optional
      if (result.authorizationWarning) {
        expect(typeof result.authorizationWarning).toBe('string')
      }
      if (result.authorizationError) {
        expect(typeof result.authorizationError).toBe('string')
      }
    })
  })

  describe('Specification: Deploy GameScore', () => {
    it('SPEC: deployGameScore - successfully deploys', async () => {
      const result = await deployGameScore({})

      expect(result.success).toBe(true)
      expect(result.address).toBeDefined()
      expect(result.transactionHash).toBeDefined()
    })

    it('SPEC: deployGameScore - returns DeploymentResult structure', async () => {
      const result = await deployGameScore({})

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('transactionHash')
    })

    it('SPEC: deployGameScore - does not require parameters', async () => {
      // Should work with empty params
      const result = await deployGameScore({})

      expect(result.success).toBe(true)
    })
  })

  describe('Specification: Error Handling', () => {
    it('SPEC: deployment fails gracefully when environment not configured', async () => {
      delete process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY

      await expect(deployGameMatch({})).rejects.toThrow()
    })

    it('SPEC: deployment fails when factory address missing', async () => {
      delete process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY

      await expect(deployGameScore({})).rejects.toThrow()
    })
  })

  describe('Specification: Storage Integration', () => {
    it('SPEC: deployGameMatch - saves address to storage', async () => {
      const { setContractAddress } = await import('../storage/contractStorage')
      
      await deployGameMatch({})

      expect(setContractAddress).toHaveBeenCalled()
    })

    it('SPEC: deployGameScore - saves address to storage', async () => {
      const { setContractAddress } = await import('../storage/contractStorage')
      
      await deployGameScore({})

      expect(setContractAddress).toHaveBeenCalled()
    })
  })
})
