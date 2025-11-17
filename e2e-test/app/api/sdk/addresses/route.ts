import { getContracts, getControllerAddress } from '@ohara-ai/sdk/server'
import { NextRequest, NextResponse } from 'next/server'

// Mark this route as dynamic since it depends on query parameters
export const dynamic = 'force-dynamic'

/**
 * GET /api/sdk/addresses
 * Returns contract addresses for a specific chain
 */
export async function GET(request: NextRequest) {
  try {
    const chainIdParam = request.nextUrl.searchParams.get('chainId')
    
    if (!chainIdParam) {
      return NextResponse.json(
        { error: 'chainId parameter is required' },
        { status: 400 }
      )
    }
    
    const chainId = parseInt(chainIdParam, 10)
    
    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chainId parameter' },
        { status: 400 }
      )
    }
    
    // Get controller address (derived from stored private key)
    const controllerAddress = await getControllerAddress()
    console.log('Controller address:', controllerAddress)
    
    // Get contract addresses from storage
    const addresses = await getContracts(chainId)
    console.log('Contract addresses:', addresses)
    
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
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching contract addresses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract addresses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
