import { setContractAddress } from '../storage/contractStorage'
import { SCORE_FACTORY_ABI } from '../abis/game/scoreFactory'
import {
  createDeploymentClients,
  createPublicClientOnly,
  extractDeployedAddress,
  getDeploymentConfig,
} from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { OharaApiClient, getOharaApiClient } from '../server/oharaApiClient'

export interface GameScoreDeployParams {}

/**
 * Deploy a GameScore contract instance
 * Supports both direct on-chain and Ohara API modes
 */
export async function deployGameScore(
  _params: GameScoreDeployParams,
): Promise<DeploymentResult> {
  // Check if we're in API mode
  if (OharaApiClient.isConfigured()) {
    const apiClient = getOharaApiClient()

    // Get chain ID from RPC
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
    const publicClient = createPublicClientOnly(rpcUrl)
    const chainId = await publicClient.getChainId()

    // Deploy via Ohara API
    const result = await apiClient.deployContract({
      factoryType: 'ScoreFactory',
      chainId,
    })

    console.debug('Deployed GameScore via Ohara API:', JSON.stringify(result))

    // Wait for transaction confirmation
    const status = await apiClient.waitForTransaction(result.data.txHash)

    if (status.status === 'FAILED') {
      throw new Error(
        `Deployment failed: ${status.errorMessage || 'Unknown error'}`,
      )
    }

    // Save to storage
    try {
      await setContractAddress(
        'game',
        'score',
        result.data.contractAddress,
        chainId,
      )
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

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: config.game.score.factoryAddress,
    abi: SCORE_FACTORY_ABI,
    functionName: 'deployScore',
    args: [],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(
    receipt,
    config.game.score.factoryAddress,
  )
  if (!deployedAddress) {
    throw new Error(
      'Could not extract deployed address from transaction receipt',
    )
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress('game', 'score', deployedAddress, chainId)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}
