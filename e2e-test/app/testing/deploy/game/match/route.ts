import { deployGameMatch } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameScoreAddress, feeRecipients, feeShares } = body

    const result = await deployGameMatch({
      gameScoreAddress: gameScoreAddress as `0x${string}` | undefined,
      feeRecipients,
      feeShares,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 },
    )
  }
}
