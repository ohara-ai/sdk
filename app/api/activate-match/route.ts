import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const GAME_MATCH_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'activateMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'getMatch',
    outputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'stakeAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPlayers', type: 'uint256' },
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'enum IGameMatch.MatchStatus', name: 'status', type: 'uint8' },
      { internalType: 'address', name: 'winner', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export async function POST(request: NextRequest) {
  try {
    const { matchId, contractAddress } = await request.json()

    if (matchId === undefined || matchId === null) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      )
    }

    // Get configuration from environment
    const controllerKey = process.env.CONTROLLER_KEY
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'

    if (!controllerKey) {
      return NextResponse.json(
        { error: 'CONTROLLER_KEY not configured in environment' },
        { status: 500 }
      )
    }

    // Create account from controller private key
    const account = privateKeyToAccount(controllerKey as `0x${string}`)

    // Create clients
    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    // First verify the match can be activated (has at least 2 players and status is Open)
    const matchData = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'getMatch',
      args: [BigInt(matchId)],
    })

    const [, , , players, status] = matchData
    
    if (status !== 0) {
      return NextResponse.json(
        { error: 'Match is not in Open status' },
        { status: 400 }
      )
    }

    if (players.length < 2) {
      return NextResponse.json(
        { error: 'Match needs at least 2 players to be activated' },
        { status: 400 }
      )
    }

    // Activate the match
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'activateMatch',
      args: [BigInt(matchId)],
      chain: null,
    })

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      status: receipt.status,
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Activation failed' },
      { status: 500 }
    )
  }
}
