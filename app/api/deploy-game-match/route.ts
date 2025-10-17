import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setContractAddress } from '@/lib/server/contractStorage'

const GAME_MATCH_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_controller', type: 'address' },
      { internalType: 'address', name: '_scoreBoard', type: 'address' },
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
      { indexed: false, internalType: 'address', name: 'scoreBoard', type: 'address' },
    ],
    name: 'GameMatchDeployed',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      factoryAddress, 
      scoreBoardAddress: requestScoreBoardAddress,
      feeRecipients: requestFeeRecipients,
      feeShares: requestFeeShares
    } = body

    if (!factoryAddress) {
      return NextResponse.json(
        { error: 'Factory address is required' },
        { status: 400 }
      )
    }

    // Get configuration from environment
    const privateKey = process.env.PRIVATE_KEY
    const controllerAddress = process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'

    // Use request parameters or fall back to environment defaults
    const scoreBoardAddress = requestScoreBoardAddress || 
      process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS || 
      '0x0000000000000000000000000000000000000000'

    // Parse fee configuration from request or environment
    let feeRecipients: string[] = []
    let feeShares: bigint[] = []
    
    if (requestFeeRecipients && requestFeeShares && requestFeeRecipients.length > 0) {
      // Use request parameters
      feeRecipients = requestFeeRecipients
      feeShares = requestFeeShares.map((s: string) => BigInt(s))
    } else {
      // Fall back to environment
      const feeRecipientsStr = process.env.NEXT_PUBLIC_FEE_RECIPIENTS || ''
      const feeSharesStr = process.env.NEXT_PUBLIC_FEE_SHARES || ''
      feeRecipients = feeRecipientsStr ? feeRecipientsStr.split(',') : []
      feeShares = feeSharesStr ? feeSharesStr.split(',').map(s => BigInt(s.trim())) : []
    }

    if (!privateKey) {
      return NextResponse.json(
        { error: 'PRIVATE_KEY not configured in environment' },
        { status: 500 }
      )
    }

    if (!controllerAddress) {
      return NextResponse.json(
        { error: 'Controller address not configured' },
        { status: 500 }
      )
    }

    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    // Create clients without specifying chain - let them auto-detect
    // This prevents chain ID mismatches with local networks
    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    // Get chain ID for storage
    const chainId = await publicClient.getChainId()

    // Deploy the contract
    // Note: Owner is managed by the factory (uses factory's instanceOwner or factory owner)
    const hash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: GAME_MATCH_FACTORY_ABI,
      functionName: 'deployGameMatch',
      args: [
        controllerAddress as `0x${string}`,
        scoreBoardAddress as `0x${string}`,
      ],
      chain: null,
    })

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // Extract deployed address from logs
    // The GameMatchDeployed event has the instance as the first indexed parameter (topic[1])
    let deployedAddress: `0x${string}` | null = null
    
    for (const log of receipt.logs) {
      // Check if this log is from the factory contract
      if (log.address.toLowerCase() === factoryAddress.toLowerCase() && log.topics.length >= 2) {
        // The instance address is in topic[1] (first indexed parameter)
        // Topics are 32 bytes, addresses are 20 bytes, so we take the last 40 hex chars
        const instanceTopic = log.topics[1]
        if (instanceTopic) {
          deployedAddress = `0x${instanceTopic.slice(-40)}` as `0x${string}`
          break
        }
      }
    }

    if (!deployedAddress) {
      throw new Error('Could not extract deployed address from transaction receipt')
    }

    // Note: Fees are now configured at deployment time via the factory's defaultFees
    // If you need to override fees for a specific instance, you can still call configureFees
    // after deployment (but this is uncommon - factory defaults should be set instead)
    if (feeRecipients.length > 0 && feeShares.length > 0) {
      // Optional: Override factory defaults for this specific instance
      try {
        const feeHash = await walletClient.writeContract({
          address: deployedAddress,
          abi: GAME_MATCH_ABI,
          functionName: 'configureFees',
          args: [feeRecipients as `0x${string}`[], feeShares],
          chain: null,
        })

        // Wait for fee configuration transaction
        await publicClient.waitForTransactionReceipt({ hash: feeHash })
      } catch (feeError) {
        console.error('Fee configuration override error:', feeError)
        // Continue - factory defaults will be used
      }
    }

    // If scoreboard is configured (not zero address), authorize the GameMatch to record results
    if (scoreBoardAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        const authHash = await walletClient.writeContract({
          address: scoreBoardAddress as `0x${string}`,
          abi: SCOREBOARD_ABI,
          functionName: 'setRecorderAuthorization',
          args: [deployedAddress, true],
          chain: null,
        })

        // Wait for authorization transaction
        await publicClient.waitForTransactionReceipt({ hash: authHash })
      } catch (authError) {
        console.error('Authorization error:', authError)
        // Return success but with authorization warning
        return NextResponse.json({
          success: true,
          address: deployedAddress,
          transactionHash: hash,
          authorizationWarning: 'GameMatch deployed but ScoreBoard authorization failed. You may need to manually authorize the contract.',
          authorizationError: authError instanceof Error ? authError.message : 'Unknown error'
        })
      }
    }

    // Save the deployed address to backend storage
    try {
      await setContractAddress(chainId, 'gameMatch', deployedAddress)
    } catch (storageError) {
      console.error('Failed to save address to backend storage:', storageError)
      // Continue - deployment was successful even if storage failed
    }

    return NextResponse.json({
      success: true,
      address: deployedAddress,
      transactionHash: hash,
    })
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    )
  }
}
