import { NextRequest, NextResponse } from 'next/server'
import { deployGameMatch, getDeploymentConfig } from '@/lib/server/deploymentService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      factoryAddress, 
      gameScoreAddress,
      feeRecipients,
      feeShares
    } = body

    if (!factoryAddress) {
      return NextResponse.json(
        { error: 'Factory address is required' },
        { status: 400 }
      )
    }

    // Get deployment configuration from environment
    const config = getDeploymentConfig()

    // Use request parameters or fall back to environment defaults
    const finalGameScoreAddress = gameScoreAddress || 
      process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS ||
      undefined

    // Deploy the contract using the service
    const result = await deployGameMatch(
      {
        factoryAddress: factoryAddress as `0x${string}`,
        gameScoreAddress: finalGameScoreAddress as `0x${string}` | undefined,
        feeRecipients,
        feeShares,
      },
      config
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    )
  }
}
