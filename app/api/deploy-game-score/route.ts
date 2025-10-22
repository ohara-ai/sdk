import { NextRequest, NextResponse } from 'next/server'
import { deployGameScore, getDeploymentConfig } from '@/lib/server/deploymentService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { factoryAddress } = body

    if (!factoryAddress) {
      return NextResponse.json(
        { error: 'Factory address is required' },
        { status: 400 }
      )
    }

    // Get deployment configuration from environment
    const config = getDeploymentConfig()

    // Deploy the contract using the service
    const result = await deployGameScore(
      { factoryAddress: factoryAddress as `0x${string}` },
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
