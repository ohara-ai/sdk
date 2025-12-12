import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { getContracts } from '@ohara-ai/sdk/server'

export const dynamic = 'force-dynamic'

interface ContractValidation {
  type: 'Score' | 'Match'
  address: string | undefined
  existsOnChain: boolean
  source: 'local' | 'api' | 'none'
}

/**
 * Check if a contract address actually has code deployed on-chain
 */
async function contractExistsOnChain(
  address: string | undefined,
  rpcUrl: string,
): Promise<boolean> {
  if (!address) return false

  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    const code = await publicClient.getCode({
      address: address as `0x${string}`,
    })

    return !!code && code !== '0x'
  } catch {
    return false
  }
}

/**
 * GET /api/sdk/validate-contracts
 * Validates that stored contract addresses actually exist on-chain.
 * Uses NEXT_PUBLIC_SDK_CHAIN_ID from environment configuration.
 * This is useful for detecting when anvil has been rebooted but cached
 * addresses are stale.
 */
export async function GET() {
  try {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
    const chainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID 
      ? parseInt(process.env.NEXT_PUBLIC_SDK_CHAIN_ID, 10) 
      : undefined

    // Get stored contracts (uses NEXT_PUBLIC_SDK_CHAIN_ID from config)
    const contracts = await getContracts()

    // Validate each contract on-chain
    const validations: ContractValidation[] = []

    // Check Score
    const scoreAddress = contracts.game?.score
    const scoreExists = await contractExistsOnChain(scoreAddress, rpcUrl)
    validations.push({
      type: 'Score',
      address: scoreAddress,
      existsOnChain: scoreExists,
      source: scoreAddress ? 'api' : 'none',
    })

    // Check Match
    const matchAddress = contracts.game?.match
    const matchExists = await contractExistsOnChain(matchAddress, rpcUrl)
    validations.push({
      type: 'Match',
      address: matchAddress,
      existsOnChain: matchExists,
      source: matchAddress ? 'api' : 'none',
    })

    // Determine overall status
    const hasStaleAddresses = validations.some(v => v.address && !v.existsOnChain)
    const allValid = validations.every(v => !v.address || v.existsOnChain)

    return NextResponse.json({
      validations,
      hasStaleAddresses,
      allValid,
      chainId,
      rpcUrl,
      message: hasStaleAddresses 
        ? 'Some contract addresses are stale (not found on-chain). Chain may have been reset.'
        : allValid 
          ? 'All contract addresses are valid on-chain.'
          : 'Validation complete.',
    })
  } catch (error) {
    console.error('Error validating contracts:', error)
    return NextResponse.json(
      {
        error: 'Failed to validate contracts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
