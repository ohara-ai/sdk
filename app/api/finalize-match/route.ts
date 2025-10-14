import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, createPublicClient, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const GAME_MATCH_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'address', name: 'winner', type: 'address' },
    ],
    name: 'finalizeMatch',
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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalPrize', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'winnerAmount', type: 'uint256' },
    ],
    name: 'MatchFinalized',
    type: 'event',
  },
] as const

export async function POST(request: NextRequest) {
  try {
    const { matchId, winner, contractAddress } = await request.json()

    if (matchId === undefined || matchId === null) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    if (!winner) {
      return NextResponse.json(
        { error: 'Winner address is required' },
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

    // First verify the match can be finalized (status is Active)
    const matchData = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'getMatch',
      args: [BigInt(matchId)],
    })

    const [, , , players, status] = matchData
    
    if (status !== 1) {
      return NextResponse.json(
        { error: 'Match is not in Active status' },
        { status: 400 }
      )
    }

    // Verify winner is a player in the match
    const winnerLower = winner.toLowerCase()
    const isValidWinner = players.some((player: string) => player.toLowerCase() === winnerLower)
    
    if (!isValidWinner) {
      return NextResponse.json(
        { error: 'Winner must be a player in the match' },
        { status: 400 }
      )
    }

    // Finalize the match
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'finalizeMatch',
      args: [BigInt(matchId), winner as `0x${string}`],
      chain: null,
    })

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // Extract MatchFinalized event data from logs
    let totalPrize: string | undefined
    let winnerAmount: string | undefined
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
        try {
          const decoded = decodeEventLog({
            abi: GAME_MATCH_ABI,
            data: log.data,
            topics: log.topics,
          })
          
          if (decoded.eventName === 'MatchFinalized') {
            const args = decoded.args as {
              matchId: bigint
              winner: string
              totalPrize: bigint
              winnerAmount: bigint
            }
            totalPrize = args.totalPrize.toString()
            winnerAmount = args.winnerAmount.toString()
            break
          }
        } catch (e) {
          // Skip logs that don't match our ABI
          continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      status: receipt.status,
      winner,
      totalPrize,
      winnerAmount,
    })
  } catch (error) {
    console.error('Finalization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalization failed' },
      { status: 500 }
    )
  }
}
