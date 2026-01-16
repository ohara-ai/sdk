import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { predictionAddress } = body

    if (!predictionAddress) {
      return NextResponse.json(
        { error: 'predictionAddress is required' },
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

    const txHash = await game.tournament.operations.setPrediction(predictionAddress)

    return NextResponse.json({
      success: true,
      txHash,
      predictionAddress,
    })
  } catch (error) {
    console.error('Set prediction contract error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to set prediction contract',
      },
      { status: 500 },
    )
  }
}
