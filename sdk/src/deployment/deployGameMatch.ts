import { setContractAddress } from '../storage/contractStorage'
import { MATCH_FACTORY_ABI } from '../abis/game/matchFactory'
import { MATCH_ABI } from '../abis/game/match'
import { SCORE_ABI } from '../abis/game/score'
import { createDeploymentClients, extractDeployedAddress, getDeploymentConfig } from './deploymentService'
import type { DeploymentResult } from './deploymentService'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'

export interface GameMatchDeployParams {
  gameScoreAddress?: `0x${string}`
  feeRecipients?: string[]
  feeShares?: string[]
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
    console.log('Fee configuration:', params.feeRecipients, params.feeShares)
    feeRecipients = params.feeRecipients
    feeShares = params.feeShares.map((s: string) => BigInt(s))
  }

  // Deploy the contract
  const hash = await walletClient.writeContract({
    address: config.game.match.factoryAddress,
    abi: MATCH_FACTORY_ABI,
    functionName: 'deployMatch',
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
      // Use PRIVATE_KEY from environment variables for fee configuration
      const privateKey = process.env.PRIVATE_KEY
      if (!privateKey) {
        throw new Error('PRIVATE_KEY environment variable not set')
      }
      
      const feeAccount = privateKeyToAccount(privateKey as `0x${string}`)
      const feeWalletClient = createWalletClient({
        account: feeAccount,
        transport: http(config.rpcUrl),
      })
      
      const feeHash = await feeWalletClient.writeContract({
        address: deployedAddress,
        abi: MATCH_ABI,
        functionName: 'configureFees',
        args: [feeRecipients as `0x${string}`[], feeShares],
        chain: null,
        account: feeAccount,
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
        abi: SCORE_ABI,
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
