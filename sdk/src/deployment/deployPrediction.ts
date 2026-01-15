import { setContractAddress } from '../storage/contractStorage'
import { PREDICTION_FACTORY_ABI } from '../abis/game/predictionFactory'
import {
  createDeploymentClients,
  createPublicClientOnly,
  extractDeployedAddress,
  getDeploymentConfig,
} from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { OharaApiClient, getOharaApiClient } from '../server/oharaApiClient'
import { getConfig } from '../config/oharaConfig'

export interface PredictionDeployParams {
  matchAddress?: `0x${string}`
  tournamentAddress?: `0x${string}`
  leagueAddress?: `0x${string}`
}

/**
 * Deploy a Prediction contract instance
 * Supports both direct on-chain and Ohara API modes
 */
export async function deployPrediction(
  params: PredictionDeployParams,
): Promise<DeploymentResult> {
  const config = getConfig()

  const factoryAddress = config.factories.prediction
  if (!factoryAddress) {
    throw new Error('Prediction factory address not configured')
  }

  // Check if we're in API mode
  if (OharaApiClient.isConfigured()) {
    const apiClient = getOharaApiClient()

    const publicClient = createPublicClientOnly(config.rpcUrl)
    const chainId = await publicClient.getChainId()

    const result = await apiClient.deployContract({
      factoryType: 'PredictionFactory',
      matchAddress: params.matchAddress,
      chainId,
    })

    console.debug('Deployed Prediction via Ohara API:', JSON.stringify(result))

    const status = await apiClient.waitForTransaction(result.data.txHash)

    if (status.status === 'FAILED') {
      throw new Error(
        `Deployment failed: ${status.errorMessage || 'Unknown error'}`,
      )
    }

    try {
      await setContractAddress(
        'game',
        'prediction',
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
  const deploymentConfig = await getDeploymentConfig()
  const { walletClient, publicClient, account } =
    createDeploymentClients(deploymentConfig)

  const zeroAddress = '0x0000000000000000000000000000000000000000' as const

  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: PREDICTION_FACTORY_ABI,
    functionName: 'deployPrediction',
    args: [
      params.matchAddress || zeroAddress,
      params.tournamentAddress || zeroAddress,
      params.leagueAddress || zeroAddress,
    ],
    chain: null,
    account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  const deployedAddress = extractDeployedAddress(receipt, factoryAddress)
  if (!deployedAddress) {
    throw new Error(
      'Could not extract deployed address from transaction receipt',
    )
  }

  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress('game', 'prediction', deployedAddress, chainId)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}
