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
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'cancelMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

/**
 * Finalize match on-chain based on game result
 */
async function finalizeMatchOnChain(
  matchId: string,
  contractAddress: string,
  winnerAddress: string | null // null for tie
): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
  try {
    const controllerKey = process.env.CONTROLLER_KEY
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'

    if (!controllerKey) {
      throw new Error('CONTROLLER_KEY not configured')
    }

    const account = privateKeyToAccount(controllerKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    let hash: `0x${string}`

    if (winnerAddress === null) {
      // Tie game - cancel match and refund stakes
      hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: GAME_MATCH_ABI,
        functionName: 'cancelMatch',
        args: [BigInt(matchId)],
        chain: null,
      })
      console.log('🤝 Tie game - cancelling match:', matchId)
    } else {
      // Winner exists - finalize match
      hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: GAME_MATCH_ABI,
        functionName: 'finalizeMatch',
        args: [BigInt(matchId), winnerAddress as `0x${string}`],
        chain: null,
      })
      console.log('🏆 Finalizing match with winner:', matchId, winnerAddress)
    }

    await publicClient.waitForTransactionReceipt({ hash })

    return {
      success: true,
      transactionHash: hash,
    }
  } catch (error) {
    console.error('Finalization error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Finalization failed',
    }
  }
}

/**
 * Make a move in the game
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, playerAddress, position } = await request.json()

    if (!matchId || !playerAddress || position === undefined) {
      return NextResponse.json(
        { error: 'matchId, playerAddress, and position are required' },
        { status: 400 }
      )
    }

    // Make the move
    const result = GameStateStorage.makeMove(matchId, playerAddress, position)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    const { gameState } = result

    // If game is finished, finalize on-chain
    if (gameState.status === 'finished') {
      console.log('🎮 Game finished, finalizing on-chain...')
      
      let winnerAddress: string | null = null
      
      if (gameState.winner === 'X') {
        winnerAddress = gameState.players.X
      } else if (gameState.winner === 'O') {
        winnerAddress = gameState.players.O
      }
      // winner === 'draw' means winnerAddress stays null

      // Finalize on-chain (non-blocking)
      finalizeMatchOnChain(matchId, gameState.contractAddress, winnerAddress)
        .then((finalizationResult) => {
          if (finalizationResult.success) {
            console.log('✅ Match finalized on-chain:', finalizationResult.transactionHash)
            // Clean up game state after successful finalization
            setTimeout(() => {
              GameStateStorage.deleteGame(matchId)
            }, 5000) // Keep for 5 seconds for final state queries
          } else {
            console.error('❌ Failed to finalize match:', finalizationResult.error)
          }
        })
    }

    return NextResponse.json({
      success: true,
      game: gameState,
    })
  } catch (error) {
    console.error('Move error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to make move' },
      { status: 500 }
    )
  }
}
