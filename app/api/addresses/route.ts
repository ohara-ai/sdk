import { NextRequest, NextResponse } from 'next/server'
import { getContracts, getControllerAddress } from '@/sdk/src/server'

/**
 * GET /api/addresses
 * Returns contract addresses for a specific chain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chainIdParam = searchParams.get('chainId')
    
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
    
    // Get contract addresses from storage
    const addresses = await getContracts(chainId)
    
    // Get controller address (derived from stored private key)
    const controllerAddress = await getControllerAddress()
    
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
