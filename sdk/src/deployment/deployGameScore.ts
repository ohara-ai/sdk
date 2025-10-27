import { setContractAddress } from '../storage/contractStorage'
import { GAME_SCORE_FACTORY_ABI } from '../abis/gameScoreFactory'
import { createDeploymentClients, extractDeployedAddress, getDeploymentConfig } from './deploymentService'
import type { DeploymentResult } from './deploymentService'

export interface GameScoreDeployParams {
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
