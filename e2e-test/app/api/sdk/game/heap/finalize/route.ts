import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { heapId, winner } = body

    if (heapId === undefined || heapId === null) {
      return NextResponse.json(
        { error: 'heapId is required' },
        { status: 400 },
      )
    }

    if (!winner) {
      return NextResponse.json(
        { error: 'winner address is required' },
        { status: 400 },
      )
    }

    // Create server context with controller wallet
    const { game } = await createServerOharaAi()

    if (!game.heap?.operations) {
      return NextResponse.json(
        { error: 'Heap operations not available' },
        { status: 500 },
      )
    }

    // Get heap data before finalization
    const heapData = await game.heap.operations.get(BigInt(heapId))
    const feeConfig = await game.heap.operations.getFeeConfiguration()

    const totalPrize = heapData.totalPrize

    // Calculate actual fees based on contract configuration
    const feeAmount = (totalPrize * feeConfig.totalShare) / 10000n
    const winnerAmount = totalPrize - feeAmount

    // Call finalize operation from SDK (controller-only)
    const success = await game.heap.operations.finalize(
      BigInt(heapId),
      winner as `0x${string}`,
    )

    return NextResponse.json({
      success,
      heapId,
      winner,
      totalPrize: totalPrize.toString(),
      winnerAmount: winnerAmount.toString(),
      feeAmount: feeAmount.toString(),
      feePercentage: (Number(feeConfig.totalShare) / 100).toString(),
    })
  } catch (error) {
    console.error('Heap finalization error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to finalize heap',
      },
      { status: 500 },
    )
  }
}
