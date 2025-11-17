import { createWalletClient, http, createPublicClient, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getControllerKey, getControllerAddress } from '../storage/contractStorage'
import { OharaApiClient } from '../server/oharaApiClient'

// Types
export interface DeploymentConfig {
  appControllerPrivateKey?: string
  rpcUrl: string
  controllerAddress?: string
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
  if (!config.appControllerPrivateKey) {
    throw new Error('Private key required for creating deployment clients')
  }
  
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

/**
 * Create just a public client (no wallet/account needed)
 * Useful for API mode where we only need to query chain info
 */
export function createPublicClientOnly(rpcUrl: string): PublicClient {
  return createPublicClient({
    transport: http(rpcUrl),
  })
}

// Re-export deployment functions from separate files
export { deployGameScore } from './deployGameScore'
export { deployGameMatch } from './deployGameMatch'

/**
 * Get deployment configuration from storage and environment variables
 * In API mode, private key is not fetched since deployments go through the API
 */
export async function getDeploymentConfig(): Promise<DeploymentConfig> {
  const isApiMode = OharaApiClient.isConfigured()
  
  let appControllerPrivateKey: string | undefined
  let controllerAddress: string | undefined
  
  if (!isApiMode) {
    // Only fetch private key and address in direct on-chain mode
    appControllerPrivateKey = await getControllerKey()
    controllerAddress = await getControllerAddress()
    
    if (!controllerAddress) {
      throw new Error('Failed to derive controller address from private key')
    }
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
