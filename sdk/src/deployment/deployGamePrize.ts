import { setContractAddress } from '../storage/contractStorage'
import { PRIZE_FACTORY_ABI } from '../abis/game/prizeFactory'
import {
  createDeploymentClients,
  createPublicClientOnly,
  extractDeployedAddress,
  getDeploymentConfig,
} from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { OharaApiClient, getOharaApiClient } from '../server/oharaApiClient'

export interface GamePrizeDeployParams {
  gameMatchAddress?: `0x${string}`
  matchesPerPool?: string
}

/**
 * Deploy a GamePrize contract instance
 * Supports both direct on-chain and Ohara API modes
 */
export async function deployGamePrize(
  params: GamePrizeDeployParams,
): Promise<DeploymentResult> {
  const gameMatchAddress =
    params.gameMatchAddress || '0x0000000000000000000000000000000000000000'

  // Check if we're in API mode
  if (OharaApiClient.isConfigured()) {
    const apiClient = getOharaApiClient()

    // Get chain ID from RPC
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
    const publicClient = createPublicClientOnly(rpcUrl)
    const chainId = await publicClient.getChainId()

    const result = await apiClient.deployContract({
      factoryType: 'PrizeFactory',
      matchAddress:
        gameMatchAddress !== '0x0000000000000000000000000000000000000000'
          ? gameMatchAddress
          : undefined,
      matchesPerPool: params.matchesPerPool,
      chainId,
    })

    console.debug('Deployed GamePrize via Ohara API:', JSON.stringify(result))

    // Wait for transaction confirmation
    const status = await apiClient.waitForTransaction(result.data.txHash)

    if (status.status === 'FAILED') {
      throw new Error(
        `Deployment failed: ${status.errorMessage || 'Unknown error'}`,
      )
    }

    // Save to storage
    try {
      await setContractAddress('game', 'prize', result.data.contractAddress, chainId)
    } catch (storageError) {
      console.error('Failed to save address to backend storage:', storageError)
    }

    return {
      success: true,
      address: result.data.contractAddress,
      transactionHash: result.data.txHash,
    }
  }

  // Direct on-chain mode
  const config = await getDeploymentConfig()
  const { walletClient, publicClient, account } =
    createDeploymentClients(config)

  const matchesPerPool = params.matchesPerPool
    ? BigInt(params.matchesPerPool)
    : undefined

  const functionName = matchesPerPool ? 'deployPrizeWithConfig' : 'deployPrize'
  const args = matchesPerPool
    ? ([gameMatchAddress as `0x${string}`, matchesPerPool] as const)
    : ([gameMatchAddress as `0x${string}`] as const)

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: config.game.prize.factoryAddress,
    abi: PRIZE_FACTORY_ABI,
    functionName,
    args: args as unknown as any,
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(
    receipt,
    config.game.prize.factoryAddress,
  )
  if (!deployedAddress) {
    throw new Error('Could not extract deployed address from transaction receipt')
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress('game', 'prize', deployedAddress, chainId)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}
