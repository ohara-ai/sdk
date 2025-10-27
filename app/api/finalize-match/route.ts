import { createServerOharaAi } from '@/sdk/src/server'
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

    // Get match data before finalization to calculate prizes
    const matchData = await game.match.operations.get(BigInt(matchId))
    const totalPrize = matchData.totalPrize
    
    // Call finalize operation from SDK
    const hash = await game.match.operations.finalize(
      BigInt(matchId),
      winner as `0x${string}`
    )

    // Calculate winner amount (total prize minus fees)
    // Note: The actual amount is calculated on-chain, this is an estimate
    // Fees are typically 5-10% based on the contract configuration
    const estimatedFees = totalPrize / 20n // 5% estimate
    const estimatedWinnerAmount = totalPrize - estimatedFees

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      matchId,
      winner,
      totalPrize: totalPrize.toString(),
      winnerAmount: estimatedWinnerAmount.toString(),
    })
  } catch (error) {
    console.error('Match finalization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finalize match' },
      { status: 500 }
    )
  }
}
