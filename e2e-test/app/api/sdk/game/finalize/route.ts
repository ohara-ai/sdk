import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, winner } = body

    if (matchId === undefined || matchId === null) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      )
    }

    if (!winner) {
      return NextResponse.json(
        { error: 'winner address is required' },
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

    // Get match data and fee configuration before finalization
    const matchData = await game.match.operations.get(BigInt(matchId))
    const feeConfig = await game.match.operations.getFeeConfiguration()
    
    const totalPrize = matchData.totalPrize
    
    // Calculate actual fees based on contract configuration
    // totalShare is in basis points (100 = 1%)
    const feeAmount = (totalPrize * feeConfig.totalShare) / 10000n
    const winnerAmount = totalPrize - feeAmount
    
    // Call finalize operation from SDK
    const hash = await game.match.operations.finalize(
      BigInt(matchId),
      winner as `0x${string}`
    )

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      matchId,
      winner,
      totalPrize: totalPrize.toString(),
      winnerAmount: winnerAmount.toString(),
      feeAmount: feeAmount.toString(),
      feePercentage: (Number(feeConfig.totalShare) / 100).toString(), // Convert basis points to percentage
    })
  } catch (error) {
    console.error('Match finalization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finalize match' },
      { status: 500 }
    )
  }
}
