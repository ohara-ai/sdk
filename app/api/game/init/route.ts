import { NextRequest, NextResponse } from 'next/server'
import { GameStateStorage } from '@/lib/server/gameStateStorage'
import { createPublicClient, http } from 'viem'

const GAME_MATCH_ABI = [
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

/**
 * Initialize a new game for an activated match
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, contractAddress } = await request.json()

    if (!matchId || !contractAddress) {
      return NextResponse.json(
        { error: 'matchId and contractAddress are required' },
        { status: 400 }
      )
    }

    // Check if game already exists
    const existingGame = GameStateStorage.getGame(matchId)
    if (existingGame) {
      return NextResponse.json({
        success: true,
        game: existingGame,
        message: 'Game already initialized',
      })
    }

    // Verify match is activated
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    const matchData = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'getMatch',
      args: [BigInt(matchId)],
    })

    const [, , , players, status] = matchData

    // Status: 0 = Open, 1 = Active, 2 = Finalized, 3 = Cancelled
    if (status !== 1) {
      return NextResponse.json(
        { error: 'Match is not in Active status' },
        { status: 400 }
      )
    }

    if (players.length !== 2) {
      return NextResponse.json(
        { error: 'TicTacToe requires exactly 2 players' },
        { status: 400 }
      )
    }

    // Initialize the game
    const game = GameStateStorage.initGame(
      matchId,
      contractAddress,
      players as string[]
    )

    return NextResponse.json({
      success: true,
      game,
    })
  } catch (error) {
    console.error('Game init error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize game' },
      { status: 500 }
    )
  }
}
