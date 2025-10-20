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
 * GET /api/match-countdown/status?matchId=X
 * Get the countdown status for a match
 * Auto-cancels countdown if match is no longer full or not in Open status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matchId = searchParams.get('matchId')

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    const state = MatchActivationStorage.getState(matchId)

    if (!state) {
      return NextResponse.json({
        success: true,
        hasCountdown: false,
        remainingSeconds: null,
      })
    }

    // Check storage state first - if already marked as activated, return immediately
    // This ensures fast response even if blockchain hasn't fully propagated yet
    if (state.activated) {
      console.log(`✅ Match ${matchId} already marked as activated in storage`)
      return NextResponse.json({
        success: true,
        hasCountdown: true,
        remainingSeconds: 0,
        activated: true,
        isActivating: false,
      })
    }

    // Verify the match is still full and in Open status
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      })

      const matchData = await publicClient.readContract({
        address: state.contractAddress as `0x${string}`,
        abi: GAME_MATCH_ABI,
        functionName: 'getMatch',
        args: [BigInt(matchId)],
      })

      const [, , maxPlayers, players, status] = matchData

      // If match is Active (status 1), mark as activated
      if (status === 1) {
        console.log(`✅ Match ${matchId} is now Active on-chain - marking as activated`)
        MatchActivationStorage.markActivated(matchId)
        
        return NextResponse.json({
          success: true,
          hasCountdown: true,
          remainingSeconds: 0,
          activated: true,
          isActivating: false,
        })
      }
      
      // If match is no longer Open (status 0) or not full, cancel countdown
      if (status !== 0 || players.length < Number(maxPlayers)) {
        console.log(`⚠️ Match ${matchId} is no longer full or not Open - auto-cancelling countdown`)
        MatchActivationStorage.cancelCountdown(matchId)
        
        return NextResponse.json({
          success: true,
          hasCountdown: false,
          remainingSeconds: null,
          cancelledReason: status !== 0 ? 'match_not_open' : 'match_not_full',
        })
      }
    } catch (error) {
      console.error('Error verifying match status:', error)
      // On error, still return countdown info but log the issue
      console.warn('Could not verify match status, continuing with countdown')
    }

    const remainingSeconds = MatchActivationStorage.getRemainingSeconds(matchId)

    return NextResponse.json({
      success: true,
      hasCountdown: true,
      remainingSeconds,
      activationDeadline: state.activationDeadline,
      fullAt: state.fullAt,
      isActivating: state.isActivating,
      activated: state.activated,
    })
  } catch (error) {
    console.error('Error getting countdown status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get countdown status' },
      { status: 500 }
    )
  }
}
