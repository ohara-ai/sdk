import { NextRequest, NextResponse } from 'next/server'
import { getContractAddresses, updateContractAddresses } from '@/lib/server/contractStorage'

/**
 * GET /api/contracts?chainId=<chainId>
 * Returns contract addresses for a specific chain
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainIdParam = searchParams.get('chainId')
    
    if (!chainIdParam) {
      return NextResponse.json(
        { error: 'chainId query parameter is required' },
        { status: 400 }
      )
    }
    
    const chainId = parseInt(chainIdParam, 10)
    
    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'chainId must be a valid number' },
        { status: 400 }
      )
    }
    
    const addresses = await getContractAddresses(chainId)
    
    return NextResponse.json({
      success: true,
      chainId,
      addresses,
    })
  } catch (error) {
    console.error('Error fetching contract addresses:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch addresses' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contracts
 * Updates contract addresses for a specific chain
 * 
 * Body: {
 *   chainId: number,
 *   addresses: {
 *     gameMatch?: string,
 *     scoreboard?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chainId, addresses } = body
    
    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json(
        { error: 'chainId is required and must be a number' },
        { status: 400 }
      )
    }
    
    if (!addresses || typeof addresses !== 'object') {
      return NextResponse.json(
        { error: 'addresses is required and must be an object' },
        { status: 400 }
      )
    }
    
    await updateContractAddresses(chainId, addresses)
    
    return NextResponse.json({
      success: true,
      chainId,
      addresses: await getContractAddresses(chainId),
    })
  } catch (error) {
    console.error('Error updating contract addresses:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update addresses' },
      { status: 500 }
    )
  }
}
