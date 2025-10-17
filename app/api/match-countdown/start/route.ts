import { NextRequest, NextResponse } from 'next/server'
import { MatchActivationStorage } from '@/lib/server/matchActivationStorage'
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
 * POST /api/match-countdown/start
 * Start the countdown for a match that just became full
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, contractAddress, countdownSeconds = 30 } = await request.json()

    if (!matchId) {
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

    // Check if countdown already exists
    const existingState = MatchActivationStorage.getState(matchId)
    if (existingState) {
      const remainingSeconds = MatchActivationStorage.getRemainingSeconds(matchId)
      return NextResponse.json({
        success: true,
        message: 'Countdown already active',
        remainingSeconds,
        state: existingState,
      })
    }

    // Verify match is actually full and in Open status
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

    const [, , maxPlayers, players, status] = matchData

    // Status 0 = Open
    if (status !== 0) {
      return NextResponse.json(
        { error: 'Match is not in Open status' },
        { status: 400 }
      )
    }

    if (players.length < Number(maxPlayers)) {
      return NextResponse.json(
        { error: 'Match is not full yet' },
        { status: 400 }
      )
    }

    // Start the countdown
    const state = MatchActivationStorage.startCountdown(
      matchId,
      contractAddress,
      countdownSeconds
    )

    // Schedule automatic activation
    const timeout = setTimeout(async () => {
      console.log('⏰ Auto-activation triggered for match:', matchId)
      try {
        // Call the activate-match API
        const activateResponse = await fetch(`${request.nextUrl.origin}/api/activate-match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, contractAddress }),
        })

        if (activateResponse.ok) {
          console.log('✅ Auto-activation successful for match:', matchId)
        } else {
          const error = await activateResponse.json()
          console.error('❌ Auto-activation failed for match:', matchId, error)
        }
      } catch (error) {
        console.error('❌ Error during auto-activation:', error)
      }
    }, countdownSeconds * 1000)

    MatchActivationStorage.setActivationTimeout(matchId, timeout)

    return NextResponse.json({
      success: true,
      state,
      remainingSeconds: countdownSeconds,
    })
  } catch (error) {
    console.error('Error starting countdown:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start countdown' },
      { status: 500 }
    )
  }
}
