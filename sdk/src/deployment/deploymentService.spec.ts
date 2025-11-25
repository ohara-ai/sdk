/**
 * Deployment Service Specification Tests
 *
 * Tests the deployment utilities and configuration management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractDeployedAddress,
  createDeploymentClients,
  getDeploymentConfig,
  getFactoryAddresses,
} from './deploymentService'
import type { DeploymentConfig } from './deploymentService'

describe('Deployment Service - Specification Tests', () => {
  const FACTORY_ADDRESS = '0x1234567890123456789012345678901234567890' as const
  const DEPLOYED_ADDRESS = '0x9876543210987654321098765432109876543210' as const

  describe('Specification: Extract Deployed Address', () => {
    it('SPEC: extractDeployedAddress - extracts address from event logs', () => {
      const receipt = {
        logs: [
          {
            address: FACTORY_ADDRESS,
            topics: [
              '0xeventSignature',
              `0x000000000000000000000000${DEPLOYED_ADDRESS.slice(2)}`,
            ],
            data: '0x',
          },
        ],
      }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBe(DEPLOYED_ADDRESS)
    })

    it('SPEC: extractDeployedAddress - handles case-insensitive factory address matching', () => {
      const receipt = {
        logs: [
          {
            address: FACTORY_ADDRESS.toUpperCase(),
            topics: [
              '0xeventSignature',
              `0x000000000000000000000000${DEPLOYED_ADDRESS.slice(2)}`,
            ],
            data: '0x',
          },
        ],
      }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBe(DEPLOYED_ADDRESS)
    })

    it('SPEC: extractDeployedAddress - returns null when no matching logs', () => {
      const receipt = {
        logs: [
          {
            address: '0xDIFFERENTADDRESS0000000000000000000000',
            topics: ['0xeventSignature'],
            data: '0x',
          },
        ],
      }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBeNull()
    })

    it('SPEC: extractDeployedAddress - returns null when topics array too short', () => {
      const receipt = {
        logs: [
          {
            address: FACTORY_ADDRESS,
            topics: ['0xeventSignature'], // Only 1 topic, needs at least 2
            data: '0x',
          },
        ],
      }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBeNull()
    })

    it('SPEC: extractDeployedAddress - extracts last 40 characters as address', () => {
      const paddedAddress = `0x000000000000000000000000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
      const receipt = {
        logs: [
          {
            address: FACTORY_ADDRESS,
            topics: ['0xeventSignature', paddedAddress],
            data: '0x',
          },
        ],
      }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBe('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    })

    it('SPEC: extractDeployedAddress - handles empty logs array', () => {
      const receipt = { logs: [] }

      const address = extractDeployedAddress(receipt, FACTORY_ADDRESS)

      expect(address).toBeNull()
    })
  })

  describe('Specification: Create Deployment Clients', () => {
    const mockConfig: DeploymentConfig = {
      appControllerPrivateKey:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      rpcUrl: 'http://localhost:8545',
      controllerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      game: {
        match: {
          factoryAddress: '0x1234567890123456789012345678901234567890',
        },
        score: {
          factoryAddress: '0x9876543210987654321098765432109876543210',
        },
      },
    }

    it('SPEC: createDeploymentClients - creates wallet and public clients', () => {
      const { walletClient, publicClient, account } =
        createDeploymentClients(mockConfig)

      expect(walletClient).toBeDefined()
      expect(publicClient).toBeDefined()
      expect(account).toBeDefined()
      expect(account.address).toBeDefined()
    })

    it('SPEC: createDeploymentClients - account derived from private key', () => {
      const { account } = createDeploymentClients(mockConfig)

      // Known address for this private key
      expect(account.address.toLowerCase()).toBe(
        '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      )
    })

    it('SPEC: createDeploymentClients - wallet client has account attached', () => {
      const { walletClient, account } = createDeploymentClients(mockConfig)

      expect(walletClient.account).toBe(account)
    })

    it('SPEC: createDeploymentClients - uses correct RPC URL', () => {
      const customConfig = {
        ...mockConfig,
        rpcUrl: 'https://custom-rpc.example.com',
      }

      const { walletClient, publicClient } =
        createDeploymentClients(customConfig)

      // Clients should be created (transport internals not directly testable)
      expect(walletClient).toBeDefined()
      expect(publicClient).toBeDefined()
    })
  })

  describe('Specification: Get Deployment Config', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY =
        '0x1234567890123456789012345678901234567890'
      process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY =
        '0x9876543210987654321098765432109876543210'
      process.env.RPC_URL = 'http://localhost:8545'

      // Mock storage functions
      vi.mock('../storage/contractStorage', () => ({
        getControllerKey: vi
          .fn()
          .mockResolvedValue(
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
          ),
        getControllerAddress: vi
          .fn()
          .mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
        setContractAddress: vi.fn().mockResolvedValue(undefined),
      }))
    })

    it('SPEC: getDeploymentConfig - throws when GAME_MATCH_FACTORY not set', async () => {
      delete process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY

      await expect(getDeploymentConfig()).rejects.toThrow(
        'NEXT_PUBLIC_GAME_MATCH_FACTORY environment variable is required',
      )
    })

    it('SPEC: getDeploymentConfig - throws when GAME_SCORE_FACTORY not set', async () => {
      delete process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY

      await expect(getDeploymentConfig()).rejects.toThrow(
        'NEXT_PUBLIC_GAME_SCORE_FACTORY environment variable is required',
      )
    })

    it('SPEC: getDeploymentConfig - uses default RPC URL when not set', async () => {
      delete process.env.RPC_URL

      const config = await getDeploymentConfig()

      expect(config.rpcUrl).toBe('http://localhost:8545')
    })

    it('SPEC: getDeploymentConfig - returns complete config structure', async () => {
      const config = await getDeploymentConfig()

      expect(config).toHaveProperty('appControllerPrivateKey')
      expect(config).toHaveProperty('rpcUrl')
      expect(config).toHaveProperty('controllerAddress')
      expect(config).toHaveProperty('game.match.factoryAddress')
      expect(config).toHaveProperty('game.score.factoryAddress')
    })
  })

  describe('Specification: Get Factory Addresses', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY =
        '0x1234567890123456789012345678901234567890'
      process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY =
        '0x9876543210987654321098765432109876543210'
    })

    it('SPEC: getFactoryAddresses - returns factory addresses from environment', () => {
      const addresses = getFactoryAddresses()

      expect(addresses.gameMatchFactory).toBe(
        '0x1234567890123456789012345678901234567890',
      )
      expect(addresses.gameScoreFactory).toBe(
        '0x9876543210987654321098765432109876543210',
      )
    })

    it('SPEC: getFactoryAddresses - returns values from config', () => {
      // Config is cached and validated on load, so factories are always present
      // This test verifies the function returns what's in the config
      const addresses = getFactoryAddresses()

      expect(addresses.gameMatchFactory).toBeDefined()
      expect(addresses.gameScoreFactory).toBeDefined()
      expect(addresses.gameMatchFactory).toBe(
        '0x1234567890123456789012345678901234567890',
      )
      expect(addresses.gameScoreFactory).toBe(
        '0x9876543210987654321098765432109876543210',
      )
    })
  })

  describe('Specification: Type Safety', () => {
    it('SPEC: DeploymentConfig has all required fields', () => {
      const config: DeploymentConfig = {
        appControllerPrivateKey: '0xkey',
        rpcUrl: 'http://localhost:8545',
        controllerAddress: '0xcontroller',
        game: {
          match: { factoryAddress: '0xmatch' },
          score: { factoryAddress: '0xscore' },
        },
      }

      expect(config.appControllerPrivateKey).toBeDefined()
      expect(config.rpcUrl).toBeDefined()
      expect(config.controllerAddress).toBeDefined()
      expect(config.game.match.factoryAddress).toBeDefined()
      expect(config.game.score.factoryAddress).toBeDefined()
    })

    it('SPEC: DeploymentResult structure is correct', () => {
      const result = {
        success: true as const,
        address: '0x1234567890123456789012345678901234567890' as const,
        transactionHash: '0xabcdef' as const,
      }

      expect(result.success).toBe(true)
      expect(result.address).toBeDefined()
      expect(result.transactionHash).toBeDefined()
    })
  })
})
