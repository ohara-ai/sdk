import { setContractAddress } from '../storage/contractStorage'
import { HEAP_FACTORY_ABI } from '../abis/game/heapFactory'
import {
  createDeploymentClients,
  createPublicClientOnly,
  extractDeployedAddress,
  getDeploymentConfig,
} from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { OharaApiClient, getOharaApiClient } from '../server/oharaApiClient'
import { getConfig } from '../config/oharaConfig'

export interface HeapDeployParams {
  scoreAddress?: `0x${string}`
}

/**
 * Deploy a Heap contract instance
 * Supports both direct on-chain and Ohara API modes
 */
export async function deployHeap(
  params: HeapDeployParams,
): Promise<DeploymentResult> {
  const config = getConfig()

  const factoryAddress = config.factories.heap
  if (!factoryAddress) {
    throw new Error('Heap factory address not configured')
  }

  // Check if we're in API mode
  if (OharaApiClient.isConfigured()) {
    const apiClient = getOharaApiClient()

    const publicClient = createPublicClientOnly(config.rpcUrl)
    const chainId = await publicClient.getChainId()

    const result = await apiClient.deployContract({
      factoryType: 'HeapFactory',
      scoreAddress: params.scoreAddress,
      chainId,
    })

    console.log('Deployed Heap via Ohara API:', JSON.stringify(result))

    const status = await apiClient.waitForTransaction(result.data.txHash)

    if (status.status === 'FAILED') {
      throw new Error(
        `Deployment failed: ${status.errorMessage || 'Unknown error'}`,
      )
    }

    try {
      await setContractAddress(
        'game',
        'heap',
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

  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: HEAP_FACTORY_ABI,
    functionName: 'deployHeap',
    args: [params.scoreAddress || '0x0000000000000000000000000000000000000000'],
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
    await setContractAddress('game', 'heap', deployedAddress, chainId)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}
