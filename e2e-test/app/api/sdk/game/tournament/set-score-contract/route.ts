import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scoreAddress } = body

    if (!scoreAddress) {
      return NextResponse.json(
        { error: 'scoreAddress is required' },
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

    const txHash = await game.tournament.operations.setScoreContract(scoreAddress)

    return NextResponse.json({
      success: true,
      txHash,
      scoreAddress,
    })
  } catch (error) {
    console.error('Set score contract error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to set score contract',
      },
      { status: 500 },
    )
  }
}
