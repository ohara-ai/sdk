import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const GAME_MATCH_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_controller', type: 'address' },
      { internalType: 'address', name: '_scoreBoard', type: 'address' },
      { internalType: 'address[]', name: '_feeRecipients', type: 'address[]' },
      { internalType: 'uint256[]', name: '_feeShares', type: 'uint256[]' },
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
    const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS
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

    if (!ownerAddress || !controllerAddress) {
      return NextResponse.json(
        { error: 'Owner and controller addresses not configured' },
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

    // Deploy the contract
    const hash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: GAME_MATCH_FACTORY_ABI,
      functionName: 'deployGameMatch',
      args: [
        ownerAddress as `0x${string}`,
        controllerAddress as `0x${string}`,
        scoreBoardAddress as `0x${string}`,
        feeRecipients as `0x${string}`[],
        feeShares,
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
