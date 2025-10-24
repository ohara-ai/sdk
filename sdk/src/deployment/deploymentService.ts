import { createWalletClient, http, createPublicClient, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setContractAddress, getControllerKey, getControllerAddress } from '../storage/contractStorage'
import { GAME_MATCH_FACTORY_ABI } from '../abis/gameMatchFactory'
import { GAME_SCORE_FACTORY_ABI } from '../abis/gameScoreFactory'
import { GAME_SCORE_ABI } from '../abis/gameScore'
import { GAME_MATCH_ABI } from '../abis/gameMatch'

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

export interface GameMatchDeployParams {
  gameScoreAddress?: `0x${string}`
  feeRecipients?: string[]
  feeShares?: string[]
}

export interface GameScoreDeployParams {
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
function extractDeployedAddress(
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
function createDeploymentClients(config: DeploymentConfig): {
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

/**
 * Deploy a GameScore contract instance
 */
export async function deployGameScore(
  _params: GameScoreDeployParams
): Promise<DeploymentResult> {
  const config = await getDeploymentConfig()
  const { walletClient, publicClient, account } = createDeploymentClients(config)

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: config.game.score.factoryAddress,
    abi: GAME_SCORE_FACTORY_ABI,
    functionName: 'deployGameScore',
    args: [],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(receipt, config.game.score.factoryAddress)
  if (!deployedAddress) {
    throw new Error('Could not extract deployed address from transaction receipt')
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress(chainId, 'game', 'score', deployedAddress)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}

/**
 * Deploy a GameMatch contract instance
 */
export async function deployGameMatch(
  params: GameMatchDeployParams
): Promise<DeploymentResult> {
  const config = await getDeploymentConfig()
  const { walletClient, publicClient, account } = createDeploymentClients(config)

  // Use provided gameScoreAddress or default to zero address
  const gameScoreAddress = params.gameScoreAddress || '0x0000000000000000000000000000000000000000'

  // Parse fee configuration
  let feeRecipients: string[] = []
  let feeShares: bigint[] = []

  if (params.feeRecipients && params.feeShares && params.feeRecipients.length > 0) {
    feeRecipients = params.feeRecipients
    feeShares = params.feeShares.map((s: string) => BigInt(s))
  } else {
    // Fall back to environment
    const feeRecipientsStr = process.env.NEXT_PUBLIC_FEE_RECIPIENTS || ''
    const feeSharesStr = process.env.NEXT_PUBLIC_FEE_SHARES || ''
    feeRecipients = feeRecipientsStr ? feeRecipientsStr.split(',') : []
    feeShares = feeSharesStr ? feeSharesStr.split(',').map(s => BigInt(s.trim())) : []
  }

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: config.game.match.factoryAddress,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'deployGameMatch',
    args: [
      gameScoreAddress as `0x${string}`,
    ],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(receipt, config.game.match.factoryAddress)
  if (!deployedAddress) {
    throw new Error('Could not extract deployed address from transaction receipt')
  }

  // Configure fees if provided
  if (feeRecipients.length > 0 && feeShares.length > 0) {
    try {
      const feeHash = await walletClient.writeContract({
        address: deployedAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'configureFees',
        args: [feeRecipients as `0x${string}`[], feeShares],
        chain: null,
        account,
      })
      await publicClient.waitForTransactionReceipt({ hash: feeHash })
    } catch (feeError) {
      console.error('Fee configuration override error:', feeError)
    }
  }

  // Authorize GameMatch to record scores if GameScore is configured
  let authWarning: string | undefined
  let authError: string | undefined

  if (gameScoreAddress !== '0x0000000000000000000000000000000000000000') {
    try {
      const authHash = await walletClient.writeContract({
        address: gameScoreAddress as `0x${string}`,
        abi: GAME_SCORE_ABI,
        functionName: 'setRecorderAuthorization',
        args: [deployedAddress, true],
        chain: null,
        account,
      })
      await publicClient.waitForTransactionReceipt({ hash: authHash })
    } catch (authError_) {
      console.error('Authorization error:', authError_)
      authWarning = 'GameMatch deployed but GameScore authorization failed. You may need to manually authorize the contract.'
      authError = authError_ instanceof Error ? authError_.message : 'Unknown error'
    }
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress(chainId, 'game', 'match', deployedAddress)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
    authorizationWarning: authWarning,
    authorizationError: authError,
  }
}

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
