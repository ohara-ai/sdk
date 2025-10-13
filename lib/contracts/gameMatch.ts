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
export function getGameMatchAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE
  if (!address || address === '...') return undefined
  return address as `0x${string}`
}

export function getGameMatchFactoryAddress(): `0x${string}` | undefined {
  const address = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY
  if (!address || address === '...') return undefined
  return address as `0x${string}`
}
