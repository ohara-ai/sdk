export const EVENT_BUS_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "EVENT_COMPETITION_FINALIZED",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EVENT_COMPETITION_STARTED",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EVENT_MATCH_RESULT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_LISTENERS_PER_EVENT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "authorizedEmitters",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emitCompetitionFinalized",
    "inputs": [
      {
        "name": "competitionType",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "competitionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "emitCompetitionStarted",
    "inputs": [
      {
        "name": "competitionType",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "competitionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "emitMatchResult",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "losers",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "prizeAmount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getListeners",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "listeners",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isListener",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerListener",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeListener",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setEmitterAuthorization",
    "inputs": [
      {
        "name": "emitter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "EmitterAuthorized",
    "inputs": [
      {
        "name": "emitter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EventDispatchFailed",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "reason",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ListenerRegistered",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ListenerRemoved",
    "inputs": [
      {
        "name": "eventType",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "listener",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ListenerAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ListenerNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyListeners",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  }
] as const;
