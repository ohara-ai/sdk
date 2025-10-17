# TicTacToe Game Orchestration System

## Overview

The TicTacToe game is fully orchestrated by the backend, ensuring fair play, turn validation, and automatic timeout handling. The system integrates seamlessly with the MatchBoard component and handles on-chain finalization.

## Architecture

### 1. **Game State Management** (`lib/server/gameStateStorage.ts`)

- **In-memory storage** of active game states (replace with Redis/PostgreSQL in production)
- Tracks board state, players, current turn, move deadlines, and game status
- Validates moves and enforces game rules
- Detects winners and draws automatically

### 2. **Backend API Endpoints**

#### `/api/game/init` (POST)
- Initializes a new game when a match is activated
- Verifies match is in "Active" status on-chain
- Maps match participants to game players (X and O)
- Returns initial game state

#### `/api/game/state` (GET)
- Retrieves current game state by matchId
- Used for polling and real-time updates

#### `/api/game/move` (POST)
- Processes player moves
- Validates:
  - Player is in the game
  - It's the player's turn
  - Position is valid and unoccupied
  - Move deadline hasn't passed
- Updates game state
- Checks for win/draw conditions
- Auto-finalizes match on-chain when game ends

#### `/api/game/check-timeout` (POST)
- Checks if current player has exceeded 60-second move deadline
- Automatically declares timeout loser and finalizes match
- Called by frontend when timer reaches 0

### 3. **Frontend Integration** (`app/demos/tic-tac-toe/page.tsx`)

The TicTacToe page:
- **Listens** for match activation via `onMatchActivated` callback
- **Initializes** game when match becomes active
- **Polls** game state every 2 seconds for real-time updates
- **Displays** 60-second move timer with visual countdown
- **Validates** moves client-side (reinforced by backend)
- **Shows** player roles (X or O) and turn indicators
- **Handles** game completion (win/loss/draw/timeout)

### 4. **On-Chain Finalization**

When a game ends:
- **Winner**: Backend calls `finalizeMatch(matchId, winnerAddress)` - winner receives prize pool
- **Draw**: Backend calls `cancelMatch(matchId)` - all players receive stake refunds
- **Timeout**: Backend calls `finalizeMatch(matchId, winnerAddress)` - non-timeout player wins

## Game Flow

```
1. User creates/joins match → Match fills up
2. 30-second countdown → Match activated
3. Backend initializes game → Assigns X and O
4. Player X's turn (60s timer starts)
5. Player makes move → Backend validates → Updates state
6. Switch to Player O (60s timer starts)
7. Repeat until:
   - Win condition met
   - Draw (board full)
   - Player times out (>60s)
8. Backend finalizes match on-chain
9. Prizes distributed automatically
```

## Key Features

### ✅ **Turn-Based Orchestration**
- Only current turn player can make moves
- Backend enforces turn order
- Spectators can watch but not play

### ⏱️ **60-Second Move Timer**
- Visual countdown on frontend
- Backend validates deadline on each move
- Auto-finalization on timeout

### 🔒 **Player Validation**
- Only match participants can make moves
- Player addresses mapped from on-chain match data
- Prevents unauthorized moves

### 🏆 **Automatic Finalization**
- Win: Winner receives all staked funds
- Draw: All stakes refunded
- Timeout: Non-timeout player wins automatically

### 📡 **Real-Time Updates**
- 2-second polling for game state
- Event-driven match activation
- Live timer updates

## Security Considerations

### Backend Validation
All game logic is server-side to prevent:
- Cheating (invalid moves)
- Race conditions
- Double-moves
- Turn manipulation

### On-Chain Finalization
Only the controller account (backend) can:
- Activate matches
- Finalize matches
- Cancel matches (ties)

### Production Recommendations
1. **Replace in-memory storage** with Redis or PostgreSQL
2. **Add authentication** to API endpoints (verify player signatures)
3. **Rate limiting** on move endpoints
4. **WebSocket connections** instead of polling
5. **Persistent timeout monitoring** (background job)

## Testing the System

1. **Start local blockchain**: `anvil`
2. **Deploy contracts**: `npm run deploy:local`
3. **Set CONTROLLER_KEY** in `.env.local`
4. **Start dev server**: `npm run dev`
5. **Create match** with two different wallets
6. **Wait for activation** (30s countdown)
7. **Play game** - observe turn validation and timer
8. **Test timeout** - wait >60s to see auto-finalization
9. **Test draw** - fill board without winner
10. **Check on-chain** - verify stakes distributed correctly

## API Response Examples

### Game State Response
```json
{
  "success": true,
  "game": {
    "matchId": "1",
    "contractAddress": "0x...",
    "board": [null, "X", null, "O", null, null, null, null, null],
    "players": {
      "X": "0xplayer1...",
      "O": "0xplayer2..."
    },
    "currentTurn": "X",
    "status": "active",
    "winner": null,
    "moveDeadline": 1697558400000,
    "moveHistory": [...]
  }
}
```

### Move Response
```json
{
  "success": true,
  "game": {
    // Updated game state
  }
}
```

### Timeout Response
```json
{
  "success": true,
  "timedOut": true,
  "game": {
    "status": "finished",
    "winner": "O"
  },
  "winner": "0xplayer2...",
  "transactionHash": "0x..."
}
```

## Troubleshooting

### Game doesn't initialize
- Check match is in "Active" status
- Verify CONTROLLER_KEY is set
- Check RPC connection

### Moves fail
- Verify it's player's turn
- Check move deadline hasn't passed
- Ensure position is valid (0-8)

### Timeout doesn't trigger
- Frontend calls `/api/game/check-timeout` when timer hits 0
- Check backend logs for errors
- Verify on-chain finalization permissions

### Match doesn't finalize
- Check controller account has permissions
- Verify contract address is correct
- Check for sufficient gas

## Future Enhancements

- [ ] WebSocket for real-time updates (replace polling)
- [ ] Persistent storage (Redis/PostgreSQL)
- [ ] Player authentication (signature verification)
- [ ] Replay system (view past games)
- [ ] Tournament support (multi-match)
- [ ] ELO rating system
- [ ] Chat/emotes during games
- [ ] Spectator mode improvements
- [ ] Mobile responsive optimizations
