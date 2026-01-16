import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournamentId, round, matchIndex, winner } = body

    if (tournamentId === undefined || tournamentId === null) {
      return NextResponse.json(
        { error: 'tournamentId is required' },
        { status: 400 },
      )
    }

    if (round === undefined || round === null) {
      return NextResponse.json(
        { error: 'round is required' },
        { status: 400 },
      )
    }

    if (matchIndex === undefined || matchIndex === null) {
      return NextResponse.json(
        { error: 'matchIndex is required' },
        { status: 400 },
      )
    }

    if (!winner) {
      return NextResponse.json(
        { error: 'winner address is required' },
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

    const txHash = await game.tournament.operations.resolveMatch(
      BigInt(tournamentId),
      BigInt(round),
      BigInt(matchIndex),
      winner,
    )

    return NextResponse.json({
      success: true,
      txHash,
      tournamentId,
      round,
      matchIndex,
      winner,
    })
  } catch (error) {
    console.error('Match resolution error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to resolve match',
      },
      { status: 500 },
    )
  }
}
