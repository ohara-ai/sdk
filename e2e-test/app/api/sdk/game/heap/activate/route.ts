import { createServerOharaAi } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { heapId } = body

    if (heapId === undefined || heapId === null) {
      return NextResponse.json(
        { error: 'heapId is required' },
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

    // Call activate operation from SDK (controller-only)
    const success = await game.heap.operations.activate(BigInt(heapId))

    return NextResponse.json({
      success,
      heapId,
    })
  } catch (error) {
    console.error('Heap activation error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to activate heap',
      },
      { status: 500 },
    )
  }
}
