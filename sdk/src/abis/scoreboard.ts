export const SCOREBOARD_ABI = [
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
    inputs: [],
    name: 'getTotalPlayers',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
] as const
