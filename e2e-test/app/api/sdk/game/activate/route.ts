import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId } = body

    if (matchId === undefined || matchId === null) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      )
    }

    // Create server context with controller wallet
    const { game } = await createServerOharaAi()

    if (!game.match.operations) {
      return NextResponse.json(
        { error: 'Match operations not available' },
        { status: 500 }
      )
    }

    // Call activate operation from SDK
    const hash = await game.match.operations.activate(BigInt(matchId))

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      matchId,
    })
  } catch (error) {
    console.error('Match activation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate match' },
      { status: 500 }
    )
  }
}
