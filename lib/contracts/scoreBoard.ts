// Contract ABI and configuration for ScoreBoard
export const SCOREBOARD_ABI = [
  // Read functions
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerScore',
    outputs: [
      { internalType: 'uint256', name: 'totalWins', type: 'uint256' },
      { internalType: 'uint256', name: 'totalPrize', type: 'uint256' },
      { internalType: 'uint256', name: 'lastMatchId', type: 'uint256' },
      { internalType: 'uint256', name: 'lastWinTimestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'limit', type: 'uint256' }],
    name: 'getTopPlayersByWins',
    outputs: [
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'uint256[]', name: 'wins', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'prizes', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'limit', type: 'uint256' }],
    name: 'getTopPlayersByPrize',
    outputs: [
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'uint256[]', name: 'wins', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'prizes', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'getMatchRecord',
    outputs: [
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'address[]', name: 'losers', type: 'address[]' },
      { internalType: 'uint256', name: 'prize', type: 'uint256' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalMatches',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalPlayers',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'authorizedRecorders',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxLosersPerMatch',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTotalPlayers',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTotalMatches',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'address', name: 'recorder', type: 'address' },
      { internalType: 'bool', name: 'authorized', type: 'bool' },
    ],
    name: 'setRecorderAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'address[]', name: 'losers', type: 'address[]' },
      { internalType: 'uint256', name: 'prize', type: 'uint256' },
    ],
    name: 'recordMatchResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'recorder', type: 'address' },
      { indexed: false, internalType: 'bool', name: 'authorized', type: 'bool' },
    ],
    name: 'RecorderAuthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalWins', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'totalPrize', type: 'uint256' },
    ],
    name: 'ScoreRecorded',
    type: 'event',
  },
] as const

export interface PlayerScore {
  totalWins: bigint
  totalPrize: bigint
  lastMatchId: bigint
  lastWinTimestamp: bigint
}

export interface MatchRecord {
  winner: string
  losers: string[]
  prize: bigint
  timestamp: bigint
}

// Contract addresses (to be filled after deployment)
export function getScoreBoardAddress(chainId?: number): `0x${string}` | undefined {
  // First check ENV variable
  const address = process.env.NEXT_PUBLIC_SCOREBOARD_INSTANCE
  if (address && address !== '...' && address !== '0x0000000000000000000000000000000000000000') {
    return address as `0x${string}`
  }
  
  // Then check localStorage if we're in browser and have chainId
  if (typeof window !== 'undefined' && chainId) {
    const stored = localStorage.getItem(`deployed_scoreboard_${chainId}`)
    if (stored) {
      return stored as `0x${string}`
    }
  }
  
  return undefined
}

export function getScoreBoardFactoryAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_SCOREBOARD_FACTORY
  if (!address || address === '...') return undefined
  return address as `0x${string}`
}

// ScoreBoardFactory ABI
export const SCOREBOARD_FACTORY_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'instanceOwner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getInstanceOwner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxLosersPerMatch',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTotalPlayers',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTotalMatches',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [{ internalType: 'address', name: '_newInstanceOwner', type: 'address' }],
    name: 'setInstanceOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_maxLosersPerMatch', type: 'uint256' },
      { internalType: 'uint256', name: '_maxTotalPlayers', type: 'uint256' },
      { internalType: 'uint256', name: '_maxTotalMatches', type: 'uint256' },
    ],
    name: 'setDeploymentLimits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployScoreBoard',
    outputs: [{ internalType: 'address', name: 'instance', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'instance', type: 'address' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
    ],
    name: 'ScoreBoardDeployed',
    type: 'event',
  },
] as const
