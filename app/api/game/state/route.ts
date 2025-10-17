import { NextRequest, NextResponse } from 'next/server'
import { GameStateStorage } from '@/lib/server/gameStateStorage'

/**
 * Get current game state
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')

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

    return NextResponse.json({
      success: true,
      game,
    })
  } catch (error) {
    console.error('Get game state error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get game state' },
      { status: 500 }
    )
  }
}
