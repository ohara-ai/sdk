export const GAME_SCORE_ABI = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'authorizedRecorders',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerScore',
    inputs: [
      {
        name: 'player',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'totalWins',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'totalPrize',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'lastMatchId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'lastWinTimestamp',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRemainingMatchCapacity',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRemainingPlayerCapacity',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTopPlayersByPrize',
    inputs: [
      {
        name: 'limit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'players',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'wins',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'prizes',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTopPlayersByWins',
    inputs: [
      {
        name: 'limit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'players',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'wins',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'prizes',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalMatches',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalPlayers',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxLosersPerMatch',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxTotalMatches',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxTotalPlayers',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'recordMatchResult',
    inputs: [
      {
        name: 'matchId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'winner',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'losers',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'prize',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRecorderAuthorization',
    inputs: [
      {
        name: 'recorder',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'authorized',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateLimits',
    inputs: [
      {
        name: '_maxLosersPerMatch',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxTotalPlayers',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxTotalMatches',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'LimitsUpdated',
    inputs: [
      {
        name: 'maxLosersPerMatch',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'maxTotalPlayers',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'maxTotalMatches',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MatchEvicted',
    inputs: [
      {
        name: 'matchId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'timestamp',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PlayerEvicted',
    inputs: [
      {
        name: 'player',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalWins',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalPrize',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RecorderAuthorized',
    inputs: [
      {
        name: 'recorder',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'authorized',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ScoreRecorded',
    inputs: [
      {
        name: 'matchId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'winner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalWins',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'totalPrize',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'InvalidLimit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidOwner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MatchAlreadyRecorded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'Unauthorized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnauthorizedRecorder',
    inputs: [],
  },
] as const
