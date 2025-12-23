export const PREDICTION_FACTORY_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "IMPLEMENTATION",
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
    "name": "deployPrediction",
    "inputs": [
      {
        "name": "matchContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tournamentContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "leagueContract",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "instance",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deployPredictionWithFees",
    "inputs": [
      {
        "name": "matchContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tournamentContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "leagueContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "feeRecipients",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "feeShares",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "outputs": [
      {
        "name": "instance",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getInstanceOwner",
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
    "name": "instanceOwner",
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
    "name": "setInstanceOwner",
    "inputs": [
      {
        "name": "_instanceOwner",
        "type": "address",
        "internalType": "address"
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
    "name": "InstanceOwnerUpdated",
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
    "type": "event",
    "name": "PredictionDeployed",
    "inputs": [
      {
        "name": "instance",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "controller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "matchContract",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tournamentContract",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "leagueContract",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  }
] as const;
