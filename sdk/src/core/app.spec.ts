/**
 * App Operations Specification Tests
 * 
 * Tests the high-level app primitive that combines match and score operations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createAppOperations } from './app'
import type { AppOperations, AppConfig } from './app'
import { createMockPublicClient, createMockWalletClient } from '../__tests__/mocks/clients'

describe('App Operations - Specification Tests', () => {
  const MATCH_ADDRESS = '0x1234567890123456789012345678901234567890' as const
  const SCORE_ADDRESS = '0x9876543210987654321098765432109876543210' as const
  const PLAYER_ADDRESS = '0x1111111111111111111111111111111111111111' as const

  describe('Specification: Factory Function', () => {
    it('SPEC: createAppOperations - creates operations with both match and scores', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
        walletClient,
        chainId: 31337,
      }

      const app = createAppOperations(config)

      expect(app.match).toBeDefined()
      expect(app.scores).toBeDefined()
      expect(app.hasMatchSupport()).toBe(true)
      expect(app.hasScoreSupport()).toBe(true)
    })

    it('SPEC: createAppOperations - works with only match address', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
        walletClient,
      }

      const app = createAppOperations(config)

      expect(app.match).toBeDefined()
      expect(app.scores).toBeUndefined()
      expect(app.hasMatchSupport()).toBe(true)
      expect(app.hasScoreSupport()).toBe(false)
    })

    it('SPEC: createAppOperations - works with only score address', () => {
      const publicClient = createMockPublicClient()

      const config: AppConfig = {
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.match).toBeUndefined()
      expect(app.scores).toBeDefined()
      expect(app.hasMatchSupport()).toBe(false)
      expect(app.hasScoreSupport()).toBe(true)
    })

    it('SPEC: createAppOperations - works with no contract addresses', () => {
      const publicClient = createMockPublicClient()

      const config: AppConfig = {
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.match).toBeUndefined()
      expect(app.scores).toBeUndefined()
      expect(app.hasMatchSupport()).toBe(false)
      expect(app.hasScoreSupport()).toBe(false)
    })

    it('SPEC: createAppOperations - works without walletClient for read-only', () => {
      const publicClient = createMockPublicClient()

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)

      // Should still create operations (read-only)
      expect(app.match).toBeDefined()
      expect(app.scores).toBeDefined()
    })
  })

  describe('Specification: Match Support Detection', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>
    let walletClient: ReturnType<typeof createMockWalletClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(PLAYER_ADDRESS)
    })

    it('SPEC: hasMatchSupport() - returns true when match address is configured', () => {
      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
        walletClient,
      }

      const app = createAppOperations(config)

      expect(app.hasMatchSupport()).toBe(true)
    })

    it('SPEC: hasMatchSupport() - returns false when match address is missing', () => {
      const config: AppConfig = {
        publicClient,
        walletClient,
      }

      const app = createAppOperations(config)

      expect(app.hasMatchSupport()).toBe(false)
    })

    it('SPEC: match operations are undefined when not supported', () => {
      const config: AppConfig = {
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.match).toBeUndefined()
      expect(app.hasMatchSupport()).toBe(false)
    })
  })

  describe('Specification: Score Support Detection', () => {
    let publicClient: ReturnType<typeof createMockPublicClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
    })

    it('SPEC: hasScoreSupport() - returns true when score address is configured', () => {
      const config: AppConfig = {
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.hasScoreSupport()).toBe(true)
    })

    it('SPEC: hasScoreSupport() - returns false when score address is missing', () => {
      const config: AppConfig = {
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.hasScoreSupport()).toBe(false)
    })

    it('SPEC: scores operations are undefined when not supported', () => {
      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)

      expect(app.scores).toBeUndefined()
      expect(app.hasScoreSupport()).toBe(false)
    })
  })

  describe('Specification: Configuration Retrieval', () => {
    it('SPEC: getConfig() - returns the original configuration', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
        walletClient,
        chainId: 31337,
      }

      const app = createAppOperations(config)
      const retrievedConfig = app.getConfig()

      expect(retrievedConfig).toEqual(config)
      expect(retrievedConfig.chainId).toBe(31337)
      expect(retrievedConfig.gameMatchAddress).toBe(MATCH_ADDRESS)
      expect(retrievedConfig.gameScoreAddress).toBe(SCORE_ADDRESS)
    })

    it('SPEC: getConfig() - reflects partial configuration', () => {
      const publicClient = createMockPublicClient()

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)
      const retrievedConfig = app.getConfig()

      expect(retrievedConfig.gameMatchAddress).toBe(MATCH_ADDRESS)
      expect(retrievedConfig.gameScoreAddress).toBeUndefined()
      expect(retrievedConfig.walletClient).toBeUndefined()
      expect(retrievedConfig.chainId).toBeUndefined()
    })
  })

  describe('Specification: Operations Interface', () => {
    let app: AppOperations
    let publicClient: ReturnType<typeof createMockPublicClient>
    let walletClient: ReturnType<typeof createMockWalletClient>

    beforeEach(() => {
      publicClient = createMockPublicClient()
      walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
        walletClient,
      }

      app = createAppOperations(config)
    })

    it('SPEC: match operations have expected methods when configured', () => {
      expect(app.match).toBeDefined()
      
      if (app.match) {
        expect(typeof app.match.create).toBe('function')
        expect(typeof app.match.join).toBe('function')
        expect(typeof app.match.leave).toBe('function')
        expect(typeof app.match.get).toBe('function')
        expect(typeof app.match.getActiveMatches).toBe('function')
        expect(typeof app.match.withdrawFees).toBe('function')
        expect(typeof app.match.getPendingFees).toBe('function')
      }
    })

    it('SPEC: scores operations have expected methods when configured', () => {
      expect(app.scores).toBeDefined()
      
      if (app.scores) {
        expect(typeof app.scores.getPlayerScore).toBe('function')
        expect(typeof app.scores.getTopPlayersByWins).toBe('function')
        expect(typeof app.scores.getTopPlayersByPrize).toBe('function')
        expect(typeof app.scores.getTotalPlayers).toBe('function')
      }
    })

    it('SPEC: app operations have utility methods', () => {
      expect(typeof app.hasMatchSupport).toBe('function')
      expect(typeof app.hasScoreSupport).toBe('function')
      expect(typeof app.getConfig).toBe('function')
    })
  })

  describe('Specification: Client Type Enforcement', () => {
    it('SPEC: match operations use client match operations (no server ops)', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
        walletClient,
      }

      const app = createAppOperations(config)

      // Match operations should NOT have server methods
      expect(app.match).not.toHaveProperty('activate')
      expect(app.match).not.toHaveProperty('finalize')
    })
  })

  describe('Specification: Dependency Resolution', () => {
    it('SPEC: operations are initialized independently', () => {
      const publicClient = createMockPublicClient()
      const walletClient = createMockWalletClient(PLAYER_ADDRESS)

      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        // Note: no gameScoreAddress
        publicClient,
        walletClient,
      }

      const app = createAppOperations(config)

      // Match should work without scores
      expect(app.match).toBeDefined()
      expect(app.scores).toBeUndefined()
      expect(app.hasMatchSupport()).toBe(true)
      expect(app.hasScoreSupport()).toBe(false)
    })

    it('SPEC: score operations do not require wallet client', () => {
      const publicClient = createMockPublicClient()

      const config: AppConfig = {
        gameScoreAddress: SCORE_ADDRESS,
        publicClient,
        // Note: no walletClient
      }

      const app = createAppOperations(config)

      // Scores should work without wallet (read-only)
      expect(app.scores).toBeDefined()
      expect(app.hasScoreSupport()).toBe(true)
    })
  })

  describe('Specification: Type Safety', () => {
    it('SPEC: app operations type matches interface', () => {
      const publicClient = createMockPublicClient()
      const config: AppConfig = { publicClient }

      const app: AppOperations = createAppOperations(config)

      // Should compile and have correct types
      expect(app).toBeDefined()
      expect(app.match === undefined || typeof app.match === 'object').toBe(true)
      expect(app.scores === undefined || typeof app.scores === 'object').toBe(true)
    })
  })

  describe('Specification: Immutability', () => {
    it('SPEC: getConfig() returns reference to same config object', () => {
      const publicClient = createMockPublicClient()
      const config: AppConfig = {
        gameMatchAddress: MATCH_ADDRESS,
        publicClient,
      }

      const app = createAppOperations(config)
      const config1 = app.getConfig()
      const config2 = app.getConfig()

      expect(config1).toBe(config2)
      expect(config1).toBe(config)
    })
  })
})
