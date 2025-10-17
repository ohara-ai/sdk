import { NextRequest, NextResponse } from 'next/server'
import { MatchActivationStorage } from '@/lib/server/matchActivationStorage'

/**
 * POST /api/match-countdown/cancel
 * Cancel the countdown for a match (e.g., when a player withdraws)
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId } = await request.json()

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      )
    }

    MatchActivationStorage.cancelCountdown(matchId)

    return NextResponse.json({
      success: true,
      message: 'Countdown cancelled',
    })
  } catch (error) {
    console.error('Error cancelling countdown:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel countdown' },
      { status: 500 }
    )
  }
}
