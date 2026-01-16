import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId } = body

    if (tournamentId === undefined || tournamentId === null) {
      return NextResponse.json(
        { error: 'tournamentId is required' },
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

    const txHash = await game.tournament.operations.activate(BigInt(tournamentId))

    return NextResponse.json({
      success: true,
      txHash,
      tournamentId,
    })
  } catch (error) {
    console.error('Tournament activation error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to activate tournament',
      },
      { status: 500 },
    )
  }
}
