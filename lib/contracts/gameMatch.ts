// Contract ABI and configuration for GameMatch
export const GAME_MATCH_ABI = [
  // Read functions
  {
    inputs: [],
    name: 'version',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'featureName',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'getMatch',
    outputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'stakeAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPlayers', type: 'uint256' },
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'enum IGameMatch.MatchStatus', name: 'status', type: 'uint8' },
      { internalType: 'address', name: 'winner', type: 'address' },
      { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'address', name: 'player', type: 'address' },
    ],
    name: 'getPlayerStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'feeRecipients',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'feeShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalFeeShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'gameScore',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxActiveMatches',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveMatchCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getActiveMatchIds',
    outputs: [{ internalType: 'uint256[]', name: 'matchIds', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'stakeAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPlayers', type: 'uint256' },
    ],
    name: 'createMatch',
    outputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'joinMatch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'matchId', type: 'uint256' }],
    name: 'activateMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { internalType: 'address', name: 'winner', type: 'address' },
    ],
    name: 'finalizeMatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'stakeAmount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'maxPlayers', type: 'uint256' },
    ],
    name: 'MatchCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'stakeAmount', type: 'uint256' },
    ],
    name: 'PlayerJoined',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: false, internalType: 'address[]', name: 'players', type: 'address[]' },
    ],
    name: 'MatchActivated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'matchId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'totalPrize', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'winnerAmount', type: 'uint256' },
    ],
    name: 'MatchFinalized',
    type: 'event',
  },
] as const

export enum MatchStatus {
  Open = 0,
  Active = 1,
  Finalized = 2,
}

export interface Match {
  token: string
  stakeAmount: bigint
  maxPlayers: bigint
  players: string[]
  status: MatchStatus
  winner: string
}

// Contract addresses (to be filled after deployment)
export function getGameMatchAddress(chainId?: number): `0x${string}` | undefined {
  // First check ENV variable
  const address = process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE
  if (address && address !== '...') {
    return address as `0x${string}`
  }
  
  // Then check localStorage if we're in browser and have chainId
  if (typeof window !== 'undefined' && chainId) {
    const stored = localStorage.getItem(`deployed_game_match_${chainId}`)
    if (stored) {
      return stored as `0x${string}`
    }
  }
  
  return undefined
}

export function getGameMatchFactoryAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY
  if (!address || address === '...') return undefined
  return address as `0x${string}`
}

// GameMatchFactory ABI
export const GAME_MATCH_FACTORY_ABI = [
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
    name: 'defaultMaxActiveMatches',
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
    inputs: [{ internalType: 'uint256', name: '_defaultMaxActiveMatches', type: 'uint256' }],
    name: 'setDefaultMaxActiveMatches',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_controller', type: 'address' },
      { internalType: 'address', name: '_gameScore', type: 'address' },
    ],
    name: 'deployGameMatch',
    outputs: [{ internalType: 'address', name: 'instance', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: '_recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: '_shares', type: 'uint256[]' },
    ],
    name: 'setDefaultFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDefaultFees',
    outputs: [
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'shares', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'instance', type: 'address' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'controller', type: 'address' },
      { indexed: false, internalType: 'address', name: 'gameScore', type: 'address' },
    ],
    name: 'GameMatchDeployed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { indexed: false, internalType: 'uint256[]', name: 'shares', type: 'uint256[]' },
    ],
    name: 'DefaultFeesUpdated',
    type: 'event',
  },
] as const
