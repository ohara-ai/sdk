import {
  getContracts,
  getControllerAddress,
  assureContractsDeployed,
} from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

// Mark this route as dynamic since it depends on query parameters
export const dynamic = 'force-dynamic'

/**
 * GET /api/sdk/addresses
 * Returns contract addresses for a specific chain
 * 
 * This route ensures that required contracts (Score, Match) are deployed
 * before returning addresses. If contracts don't exist, they will be
 * deployed automatically.
 */
export async function GET(request: NextRequest) {
  try {
    const chainIdParam = request.nextUrl.searchParams.get('chainId')

    if (!chainIdParam) {
      return NextResponse.json(
        { error: 'chainId parameter is required' },
        { status: 400 },
      )
    }

    const chainId = parseInt(chainIdParam, 10)

    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chainId parameter' },
        { status: 400 },
      )
    }

    // Ensure contracts are deployed before returning addresses
    // This handles the deployment plan logic from ohara-api
    const deployResult = await assureContractsDeployed(chainId)
    
    if (!deployResult.success) {
      console.error(
        '[addresses route] Contract deployment had failures:',
        deployResult.message,
      )
      // Continue anyway - we'll return whatever addresses we have
    }

    // Get controller address (derived from stored private key)
    const controllerAddress = await getControllerAddress()
    
    // Get contract addresses from storage (will include newly deployed contracts)
    const addresses = await getContracts(chainId)
    
    // Merge controller address into app context and include factory addresses
    const responseData = {
      addresses: {
        ...addresses,
        app: {
          ...addresses.app,
          controller: controllerAddress,
        },
      },
      factories: {
        gameMatch: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY,
        gameScore: process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY,
      },
      // Include deployment status for debugging
      deployment: {
        success: deployResult.success,
        message: deployResult.message,
        totalDeployed: deployResult.totalDeployed,
        totalExisting: deployResult.totalExisting,
      },
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching contract addresses:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch contract addresses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
