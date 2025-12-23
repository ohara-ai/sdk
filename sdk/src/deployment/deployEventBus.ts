import { setContractAddress } from '../storage/contractStorage'
import { EVENT_BUS_FACTORY_ABI } from '../abis/base/eventBusFactory'
import {
  createDeploymentClients,
  createPublicClientOnly,
  extractDeployedAddress,
  getDeploymentConfig,
} from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { OharaApiClient, getOharaApiClient } from '../server/oharaApiClient'
import { getConfig } from '../config/oharaConfig'

export interface EventBusDeployParams {}

/**
 * Deploy an EventBus contract instance
 * Supports both direct on-chain and Ohara API modes
 */
export async function deployEventBus(
  _params: EventBusDeployParams,
): Promise<DeploymentResult> {
  const config = getConfig()
  
  // Get EventBus factory address from config
  const factoryAddress = config.factories.eventBus
  if (!factoryAddress) {
    throw new Error('EventBus factory address not configured')
  }

  // Check if we're in API mode
  if (OharaApiClient.isConfigured()) {
    const apiClient = getOharaApiClient()

    // Get chain ID from RPC
    const publicClient = createPublicClientOnly(config.rpcUrl)
    const chainId = await publicClient.getChainId()

    // Deploy via Ohara API
    const result = await apiClient.deployContract({
      factoryType: 'EventBusFactory',
      chainId,
    })

    console.log('Deployed EventBus via Ohara API:', JSON.stringify(result))

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
        'base',
        'eventBus',
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

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: EVENT_BUS_FACTORY_ABI,
    functionName: 'deployEventBus',
    args: [],
    chain: null,
    account,
  })

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Extract deployed address
  const deployedAddress = extractDeployedAddress(receipt, factoryAddress)
  if (!deployedAddress) {
    throw new Error(
      'Could not extract deployed address from transaction receipt',
    )
  }

  // Get chain ID and save to storage
  const chainId = await publicClient.getChainId()
  try {
    await setContractAddress('base', 'eventBus', deployedAddress, chainId)
  } catch (storageError) {
    console.error('Failed to save address to backend storage:', storageError)
  }

  return {
    success: true,
    address: deployedAddress,
    transactionHash: hash,
  }
}
