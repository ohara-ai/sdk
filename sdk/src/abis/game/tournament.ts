export const TOURNAMENT_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      { "name": "_owner", "type": "address", "internalType": "address" },
      { "name": "_controller", "type": "address", "internalType": "address" },
      { "name": "_scoreContract", "type": "address", "internalType": "address" },
      { "name": "_maxActive", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createTournament",
    "inputs": [
      { "name": "participants", "type": "address[]", "internalType": "address[]" }
    ],
    "outputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "activate",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "onMatchResult",
    "inputs": [
      { "name": "winner", "type": "address", "internalType": "address" },
      { "name": "loser", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveMatch",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "round", "type": "uint256", "internalType": "uint256" },
      { "name": "matchIndex", "type": "uint256", "internalType": "uint256" },
      { "name": "winner", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTournament",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ITournament.TournamentView",
        "components": [
          { "name": "participantCount", "type": "uint256", "internalType": "uint256" },
          { "name": "currentRound", "type": "uint256", "internalType": "uint256" },
          { "name": "totalRounds", "type": "uint256", "internalType": "uint256" },
          { "name": "status", "type": "uint8", "internalType": "enum ITournament.TournamentStatus" },
          { "name": "winner", "type": "address", "internalType": "address" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getParticipants",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "address[]", "internalType": "address[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBracketMatch",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "round", "type": "uint256", "internalType": "uint256" },
      { "name": "matchIndex", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ITournament.BracketMatch",
        "components": [
          { "name": "player1", "type": "address", "internalType": "address" },
          { "name": "player2", "type": "address", "internalType": "address" },
          { "name": "winner", "type": "address", "internalType": "address" },
          { "name": "resolved", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoundMatches",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "round", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "matches",
        "type": "tuple[]",
        "internalType": "struct ITournament.BracketMatch[]",
        "components": [
          { "name": "player1", "type": "address", "internalType": "address" },
          { "name": "player2", "type": "address", "internalType": "address" },
          { "name": "winner", "type": "address", "internalType": "address" },
          { "name": "resolved", "type": "bool", "internalType": "bool" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasPendingMatch",
    "inputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "p1", "type": "address", "internalType": "address" },
      { "name": "p2", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "exists", "type": "bool", "internalType": "bool" },
      { "name": "round", "type": "uint256", "internalType": "uint256" },
      { "name": "matchIndex", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getActiveTournamentCount",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "scoreContract",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "prediction",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "address", "internalType": "contract IPrediction" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxActiveTournaments",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_ACTIVE",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PARTICIPANTS",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setScoreContract",
    "inputs": [
      { "name": "_score", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPrediction",
    "inputs": [
      { "name": "_prediction", "type": "address", "internalType": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMaxActiveTournaments",
    "inputs": [
      { "name": "_max", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "controller",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "version",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "string", "internalType": "string" }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "featureName",
    "inputs": [],
    "outputs": [
      { "name": "", "type": "string", "internalType": "string" }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "event",
    "name": "TournamentCreated",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "participants", "type": "address[]", "indexed": false, "internalType": "address[]" },
      { "name": "totalRounds", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TournamentActivated",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BracketMatchResolved",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "round", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "matchIndex", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "winner", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "loser", "type": "address", "indexed": false, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundCompleted",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "round", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "advancingPlayers", "type": "address[]", "indexed": false, "internalType": "address[]" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TournamentFinalized",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "winner", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TournamentCancelled",
    "inputs": [
      { "name": "tournamentId", "type": "uint256", "indexed": true, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ScoreContractUpdated",
    "inputs": [
      { "name": "previousScore", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "newScore", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidParticipantCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidTournamentId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidStatus",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidMatchIndex",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidWinner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MatchAlreadyResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MaxTournamentsReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "LimitTooHigh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  }
] as const;
