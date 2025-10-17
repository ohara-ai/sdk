import { NextRequest, NextResponse } from 'next/server'
import { MatchActivationStorage } from '@/lib/server/matchActivationStorage'

/**
 * GET /api/match-countdown/status?matchId=X
 * Get the countdown status for a match
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
    const remainingSeconds = MatchActivationStorage.getRemainingSeconds(matchId)

    if (!state) {
      return NextResponse.json({
        success: true,
        hasCountdown: false,
        remainingSeconds: null,
      })
    }

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
