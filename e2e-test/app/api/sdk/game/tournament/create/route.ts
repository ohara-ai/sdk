import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participants } = body

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: 'participants array is required' },
        { status: 400 },
      )
    }

    const { game } = await createServerOharaAi()

    if (!game.tournament?.operations) {
      return NextResponse.json(
        { error: 'Tournament operations not available' },
        { status: 500 },
      )
    }

    const result = await game.tournament.operations.createTournament(participants)

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      tournamentId: result.tournamentId?.toString(),
    })
  } catch (error) {
    console.error('Tournament creation error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create tournament',
      },
      { status: 500 },
    )
  }
}
