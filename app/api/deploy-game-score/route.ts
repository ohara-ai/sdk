import { NextRequest, NextResponse } from 'next/server'
import { deployGameScore } from '@/sdk/src/server'

export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => ({}))

    const result = await deployGameScore({})

    return NextResponse.json(result)
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    )
  }
}
