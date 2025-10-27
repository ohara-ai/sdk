import { createWalletClient, http, createPublicClient, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getControllerKey, getControllerAddress } from '../storage/contractStorage'

// Types
export interface DeploymentConfig {
  appControllerPrivateKey: string
  rpcUrl: string
  controllerAddress: string
  game: {
    match: {
      factoryAddress: `0x${string}`
    }
    score: {
      factoryAddress: `0x${string}`
    }
  }
}

export interface DeploymentResult {
  success: true
  address: `0x${string}`
  transactionHash: `0x${string}`
  authorizationWarning?: string
  authorizationError?: string
}

/**
 * Extract deployed contract address from transaction receipt
 */
export function extractDeployedAddress(
  receipt: any,
  factoryAddress: `0x${string}`
): `0x${string}` | null {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === factoryAddress.toLowerCase() && log.topics.length >= 2) {
      const instanceTopic = log.topics[1]
      if (instanceTopic) {
        return `0x${instanceTopic.slice(-40)}` as `0x${string}`
      }
    }
  }
  return null
}

/**
 * Create viem clients for deployment
 */
export function createDeploymentClients(config: DeploymentConfig): {
  walletClient: WalletClient
  publicClient: PublicClient
  account: ReturnType<typeof privateKeyToAccount>
} {
  const account = privateKeyToAccount(config.appControllerPrivateKey as `0x${string}`)

  const walletClient = createWalletClient({
    account,
    transport: http(config.rpcUrl),
  })

  const publicClient = createPublicClient({
    transport: http(config.rpcUrl),
  })

  return { walletClient, publicClient, account }
}

// Re-export deployment functions from separate files
export { deployGameScore } from './deployGameScore'
export { deployGameMatch } from './deployGameMatch'

/**
 * Get deployment configuration from storage and environment variables
 */
export async function getDeploymentConfig(): Promise<DeploymentConfig> {
  // Get controller private key from storage
  const appControllerPrivateKey = await getControllerKey()
  
  // Derive controller address from private key
  const controllerAddress = await getControllerAddress()
  
  if (!controllerAddress) {
    throw new Error('Failed to derive controller address from private key')
  }
  
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
  
  // Get factory addresses from environment
  const gameMatchFactory = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as `0x${string}`
  const gameScoreFactory = process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY as `0x${string}`
  
  if (!gameMatchFactory) {
    throw new Error('NEXT_PUBLIC_GAME_MATCH_FACTORY not configured in environment')
  }
  
  if (!gameScoreFactory) {
    throw new Error('NEXT_PUBLIC_GAME_SCORE_FACTORY not configured in environment')
  }

  return {
    appControllerPrivateKey,
    rpcUrl,
    controllerAddress,
    game: {
      match: {
        factoryAddress: gameMatchFactory,
      },
      score: {
        factoryAddress: gameScoreFactory,
      },
    },
  }
}

/**
 * Get factory addresses from environment variables
 */
export function getFactoryAddresses() {
  return {
    gameMatchFactory: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as `0x${string}` | undefined,
    gameScoreFactory: process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY as `0x${string}` | undefined,
  }
}
