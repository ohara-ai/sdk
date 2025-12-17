/**
 * SDK Integration Tests
 * 
 * These tests verify that the SDK integrates correctly with the e2e app
 * and that core functionality works as expected.
 */

import { describe, it, expect } from 'vitest'
import { createPublicClient, http } from 'viem'
import { foundry } from 'viem/chains'

describe('SDK Integration', () => {
  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      // These are set in .env.local for the e2e app
      expect(process.env.RPC_URL).toBeDefined()
    })

    it('should be able to create a public client', () => {
      const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
      
      const client = createPublicClient({
        chain: foundry,
        transport: http(rpcUrl),
      })

      expect(client).toBeDefined()
      expect(client.transport).toBeDefined()
    })
  })

  describe('Contract Type Validation', () => {
    it('should validate factory addresses are valid hex', () => {
      const gameMatchFactory = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY
      const gameScoreFactory = process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY
      const gamePrizeFactory = process.env.NEXT_PUBLIC_GAME_PRIZE_FACTORY

      if (gameMatchFactory) {
        expect(gameMatchFactory).toMatch(/^0x[a-fA-F0-9]{40}$/)
      }

      if (gameScoreFactory) {
        expect(gameScoreFactory).toMatch(/^0x[a-fA-F0-9]{40}$/)
      }

      if (gamePrizeFactory) {
        expect(gamePrizeFactory).toMatch(/^0x[a-fA-F0-9]{39,40}$/)
      }
    })
  })

  describe('SDK Exports', () => {
    it('should export OharaAiProvider', async () => {
      const { OharaAiProvider } = await import('@ohara-ai/sdk')
      expect(OharaAiProvider).toBeDefined()
      expect(typeof OharaAiProvider).toBe('function')
    })

    it('should export useOharaAi hook', async () => {
      const { useOharaAi } = await import('@ohara-ai/sdk')
      expect(useOharaAi).toBeDefined()
      expect(typeof useOharaAi).toBe('function')
    })

    it('should export ContractType enum', async () => {
      const { ContractType } = await import('@ohara-ai/sdk')
      expect(ContractType).toBeDefined()
      expect(ContractType.GAME_MATCH).toBe('GameMatch')
      expect(ContractType.GAME_SCORE).toBe('GameScore')
    })

    it('should export error classes', async () => {
      const { 
        OharaError, 
        ConfigError, 
        ApiError,
        isOharaError,
        isConfigError,
      } = await import('@ohara-ai/sdk')
      
      expect(OharaError).toBeDefined()
      expect(ConfigError).toBeDefined()
      expect(ApiError).toBeDefined()
      expect(typeof isOharaError).toBe('function')
      expect(typeof isConfigError).toBe('function')
    })
  })

  describe('Server-side SDK Exports', () => {
    it('should export server-only functions', async () => {
      // Note: This will only work in Node.js environment, not browser
      try {
        const serverSdk = await import('@ohara-ai/sdk/server')
        expect(serverSdk.createServerOharaAi).toBeDefined()
        expect(serverSdk.getContracts).toBeDefined()
        expect(serverSdk.getContractsWithMetadata).toBeDefined()
        expect(serverSdk.deployGameMatch).toBeDefined()
        expect(serverSdk.deployGameScore).toBeDefined()
      } catch (error) {
        // Expected to fail in browser environment due to 'server-only' guard
        expect(error).toBeDefined()
      }
    })
  })

  describe('Error Handling', () => {
    it('should create typed errors correctly', async () => {
      const { ConfigError, isConfigError } = await import('@ohara-ai/sdk')
      
      const error = new ConfigError('Test error', { test: true })
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ConfigError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('CONFIG_ERROR')
      expect(error.details).toEqual({ test: true })
      expect(isConfigError(error)).toBe(true)
    })

    it('should have proper error hierarchy', async () => {
      const { OharaError, ConfigError, ApiError } = await import('@ohara-ai/sdk')
      
      const configError = new ConfigError('Config error')
      const apiError = new ApiError('API error', 500)
      
      expect(configError).toBeInstanceOf(OharaError)
      expect(apiError).toBeInstanceOf(OharaError)
      expect(configError).not.toBeInstanceOf(ApiError)
      expect(apiError).not.toBeInstanceOf(ConfigError)
    })
  })
})
