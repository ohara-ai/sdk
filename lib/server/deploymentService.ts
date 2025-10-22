import { createWalletClient, http, createPublicClient, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setContractAddress } from './contractStorage'

// ABIs
const GAME_MATCH_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_controller', type: 'address' },
      { internalType: 'address', name: '_gameScore', type: 'address' },
    ],
    name: 'deployGameMatch',
    outputs: [{ internalType: 'address', name: 'instance', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'instance', type: 'address' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'controller', type: 'address' },
      { indexed: false, internalType: 'address', name: 'gameScore', type: 'address' },
    ],
    name: 'GameMatchDeployed',
    type: 'event',
  },
] as const

const GAMESCORE_FACTORY_ABI = [
  {
    inputs: [],
    name: 'deployGameScore',
    outputs: [{ internalType: 'address', name: 'instance', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'instance', type: 'address' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
    ],
    name: 'GameScoreDeployed',
    type: 'event',
  },
] as const

const SCOREBOARD_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'recorder', type: 'address' },
      { internalType: 'bool', name: 'authorized', type: 'bool' },
    ],
    name: 'setRecorderAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const GAME_MATCH_ABI = [
  {
    inputs: [
      { internalType: 'address[]', name: '_recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: '_shares', type: 'uint256[]' },
    ],
    name: 'configureFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// Types
export interface DeploymentConfig {
  privateKey: string
  rpcUrl: string
  controllerAddress?: string
}

export interface GameMatchDeployParams {
  factoryAddress: `0x${string}`
  gameScoreAddress?: `0x${string}`
  feeRecipients?: string[]
  feeShares?: string[]
}

export interface GameScoreDeployParams {
  factoryAddress: `0x${string}`
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
  const account = privateKeyToAccount(config.privateKey as `0x${string}`)

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
  params: GameScoreDeployParams,
  config: DeploymentConfig
): Promise<DeploymentResult> {
  const { walletClient, publicClient, account } = createDeploymentClients(config)

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: params.factoryAddress,
    abi: GAMESCORE_FACTORY_ABI,
    functionName: 'deployGameScore',
    args: [],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(receipt, params.factoryAddress)
  if (!deployedAddress) {
    throw new Error('Could not extract deployed address from transaction receipt')
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress(chainId, 'gameScore', deployedAddress)
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
  params: GameMatchDeployParams,
  config: DeploymentConfig
): Promise<DeploymentResult> {
  if (!config.controllerAddress) {
    throw new Error('Controller address is required for GameMatch deployment')
  }

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
    address: params.factoryAddress,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'deployGameMatch',
    args: [
      config.controllerAddress as `0x${string}`,
      gameScoreAddress as `0x${string}`,
    ],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(receipt, params.factoryAddress)
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
        abi: SCOREBOARD_ABI,
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
    await setContractAddress(chainId, 'gameMatch', deployedAddress)
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
 * Get deployment configuration from environment variables
 */
export function getDeploymentConfig(): DeploymentConfig {
  const privateKey = process.env.PRIVATE_KEY
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
  const controllerAddress = process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS

  if (!privateKey) {
    throw new Error('PRIVATE_KEY not configured in environment')
  }

  return {
    privateKey,
    rpcUrl,
    controllerAddress,
  }
}

/**
 * Get factory addresses from environment variables
 */
export function getFactoryAddresses() {
  return {
    gameMatchFactory: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as `0x${string}` | undefined,
    gameScoreFactory: process.env.NEXT_PUBLIC_GAMESCORE_FACTORY as `0x${string}` | undefined,
  }
}
