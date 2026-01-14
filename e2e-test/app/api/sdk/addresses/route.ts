import {
  getContracts,
  getControllerAddress,
  assureContractsDeployed,
} from '@ohara-ai/sdk/server'
import { NextResponse } from 'next/server'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

/**
 * GET /api/sdk/addresses
 * Returns contract addresses for the configured chain
 * 
 * Uses NEXT_PUBLIC_SDK_CHAIN_ID from environment configuration.
 * This route ensures that required contracts (Score, Match) are deployed
 * before returning addresses. If contracts don't exist, they will be
 * deployed automatically.
 */
export async function GET() {
  try {
    // SDK functions use NEXT_PUBLIC_SDK_CHAIN_ID from config automatically
    // Ensure contracts are deployed before returning addresses
    const deployResult = await assureContractsDeployed()
    
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
    // Uses NEXT_PUBLIC_SDK_CHAIN_ID from config automatically
    const addresses = await getContracts()
    
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
        gamePrize: process.env.NEXT_PUBLIC_GAME_PRIZE_FACTORY,
        prediction: process.env.NEXT_PUBLIC_PREDICTION_FACTORY,
        league: process.env.NEXT_PUBLIC_LEAGUE_FACTORY,
        tournament: process.env.NEXT_PUBLIC_TOURNAMENT_FACTORY,
        heap: process.env.NEXT_PUBLIC_HEAP_FACTORY,
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
