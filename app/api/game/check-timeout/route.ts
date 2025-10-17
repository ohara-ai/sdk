import { NextRequest, NextResponse } from 'next/server'
import { GameStateStorage } from '@/lib/server/gameStateStorage'
import { createWalletClient, http, createPublicClient } from 'viem'
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
] as const

/**
 * Check if current player has timed out and finalize if needed
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId } = await request.json()

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      )
    }

    const game = GameStateStorage.getGame(matchId)

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    if (game.status !== 'active') {
      return NextResponse.json({
        success: true,
        timedOut: false,
        game,
        message: 'Game is not active',
      })
    }

    // Check if move deadline has passed
    if (!game.moveDeadline || Date.now() <= game.moveDeadline) {
      return NextResponse.json({
        success: true,
        timedOut: false,
        game,
        timeRemaining: game.moveDeadline ? game.moveDeadline - Date.now() : null,
      })
    }

    // Player has timed out
    console.log('⏰ Timeout detected for match:', matchId)
    const updatedGame = GameStateStorage.handleTimeout(matchId)

    if (!updatedGame) {
      return NextResponse.json(
        { error: 'Failed to handle timeout' },
        { status: 500 }
      )
    }

    // Determine winner (opposite of timed-out player)
    const winningSymbol = updatedGame.winner
    const winnerAddress = winningSymbol === 'X' 
      ? updatedGame.players.X 
      : updatedGame.players.O

    // Finalize match on-chain
    const controllerKey = process.env.CONTROLLER_KEY
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'

    if (!controllerKey) {
      return NextResponse.json(
        { error: 'CONTROLLER_KEY not configured' },
        { status: 500 }
      )
    }

    const account = privateKeyToAccount(controllerKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    const hash = await walletClient.writeContract({
      address: updatedGame.contractAddress as `0x${string}`,
      abi: GAME_MATCH_ABI,
      functionName: 'finalizeMatch',
      args: [BigInt(matchId), winnerAddress as `0x${string}`],
      chain: null,
    })

    await publicClient.waitForTransactionReceipt({ hash })

    console.log('✅ Match finalized due to timeout:', matchId, 'Winner:', winnerAddress)

    // Clean up game state
    setTimeout(() => {
      GameStateStorage.deleteGame(matchId)
    }, 5000)

    return NextResponse.json({
      success: true,
      timedOut: true,
      game: updatedGame,
      winner: winnerAddress,
      transactionHash: hash,
    })
  } catch (error) {
    console.error('Check timeout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check timeout' },
      { status: 500 }
    )
  }
}
