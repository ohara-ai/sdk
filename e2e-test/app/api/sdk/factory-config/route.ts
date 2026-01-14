import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const MATCH_FACTORY_ABI = [
  {
    type: 'function',
    name: 'defaultMaxActiveMatches',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDefaultFees',
    inputs: [],
    outputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'shares', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
] as const

const SCORE_FACTORY_ABI = [
  {
    type: 'function',
    name: 'maxLosersPerMatch',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxTotalPlayers',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxTotalMatches',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

const PRIZE_FACTORY_ABI = [
  {
    type: 'function',
    name: 'defaultMatchesPerPool',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type || !['Match', 'Score', 'Prize', 'League', 'Tournament', 'Prediction', 'Heap'].includes(type)) {
    return NextResponse.json({ error: 'Invalid factory type' }, { status: 400 })
  }

  const factoryAddresses = {
    Match: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY,
    Score: process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY,
    Prize: process.env.NEXT_PUBLIC_GAME_PRIZE_FACTORY,
    League: process.env.NEXT_PUBLIC_LEAGUE_FACTORY,
    Tournament: process.env.NEXT_PUBLIC_TOURNAMENT_FACTORY,
    Prediction: process.env.NEXT_PUBLIC_PREDICTION_FACTORY,
    Heap: process.env.NEXT_PUBLIC_HEAP_FACTORY,
  }

  const factoryAddress = factoryAddresses[type as keyof typeof factoryAddresses]

  if (!factoryAddress) {
    return NextResponse.json({ error: 'Factory address not configured' }, { status: 404 })
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.RPC_URL),
  })

  try {
    if (type === 'Match') {
      const [defaultMaxActiveMatches, defaultFees] = await Promise.all([
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: MATCH_FACTORY_ABI,
          functionName: 'defaultMaxActiveMatches',
        }),
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: MATCH_FACTORY_ABI,
          functionName: 'getDefaultFees',
        }),
      ])

      return NextResponse.json({
        defaultMaxActiveMatches: Number(defaultMaxActiveMatches),
        feeRecipients: defaultFees[0],
        feeShares: defaultFees[1].map((s) => Number(s)),
      })
    }

    if (type === 'Score') {
      const [maxLosersPerMatch, maxTotalPlayers, maxTotalMatches] = await Promise.all([
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: SCORE_FACTORY_ABI,
          functionName: 'maxLosersPerMatch',
        }),
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: SCORE_FACTORY_ABI,
          functionName: 'maxTotalPlayers',
        }),
        publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: SCORE_FACTORY_ABI,
          functionName: 'maxTotalMatches',
        }),
      ])

      return NextResponse.json({
        maxLosersPerMatch: Number(maxLosersPerMatch),
        maxTotalPlayers: Number(maxTotalPlayers),
        maxTotalMatches: Number(maxTotalMatches),
      })
    }

    if (type === 'Prize') {
      const defaultMatchesPerPool = await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
        abi: PRIZE_FACTORY_ABI,
        functionName: 'defaultMatchesPerPool',
      })

      return NextResponse.json({
        defaultMatchesPerPool: Number(defaultMatchesPerPool),
      })
    }

    // League, Tournament, Prediction, Heap factories don't have on-chain config to read
    // Just return empty config to confirm factory exists
    if (type === 'League' || type === 'Tournament' || type === 'Prediction' || type === 'Heap') {
      return NextResponse.json({})
    }

    return NextResponse.json({ error: 'Unknown factory type' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching factory config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch factory configuration' },
      { status: 500 }
    )
  }
}
