# TicTacToe Backend-Orchestrated Game - Quick Start

## Prerequisites

1. **Controller Key Setup**
   ```bash
   # In .env.local
   CONTROLLER_KEY=0x... # Private key for backend controller account
   NEXT_PUBLIC_RPC_URL=http://localhost:8545
   ```

2. **Deployed Contracts**
   ```bash
   npm run deploy:local
   # Or for testnet
   npm run deploy:testnet
   ```

## How to Play (Step by Step)

### Player 1 (Creator)
1. Connect wallet
2. Navigate to TicTacToe demo
3. Click "Create Match" in MatchBoard
4. Set stake amount (e.g., 0.01 ETH)
5. Max players: 2 (preset)
6. Submit transaction
7. Wait for Player 2...

### Player 2 (Joiner)
1. Connect wallet (different address)
2. Navigate to TicTacToe demo
3. See open match in MatchBoard
4. Click "Join Match"
5. Submit transaction with stake

### Automatic Activation
- 30-second countdown starts when match is full
- Both players see countdown banner
- Match activates automatically
- Game initializes on backend

### Playing the Game

#### As Player X (First Joiner):
- You move first
- 60 seconds to make each move
- Click any empty cell
- Watch timer countdown
- Wait for opponent's move

#### As Player O (Second Joiner):
- Wait for Player X's first move
- Make your move when it's your turn
- 60 seconds per move
- Try to get 3 in a row!

### Game Rules

**Win Conditions:**
- Get 3 X's or O's in a row (horizontal, vertical, or diagonal)
- Winner receives all staked ETH

**Draw Condition:**
- Board fills with no winner
- All players receive stake refunds

**Timeout:**
- Don't move within 60 seconds
- You lose automatically
- Opponent wins and receives prize

## UI Elements Explained

### Game Board
- **Empty Cells**: Clickable (when your turn)
- **Filled Cells**: Show X or O icons
- **Hover Effect**: Blue border on valid moves
- **Loading Overlay**: Shows when processing move

### Status Display
```
┌─────────────────────────────────────┐
│ Current Turn: Player X              │
│ [Green Badge: "Your Turn"]          │
│                                     │
│ Time Left: 45s                      │
└─────────────────────────────────────┘
```

### Player Info
```
Player X: 0x1234...5678 [You]
Player O: 0xabcd...efgh
```

### Timer Colors
- **Gray (60-11s)**: Normal time
- **Red Pulsing (<10s)**: Hurry!
- **Timeout (0s)**: Automatic check triggered

### Error Messages
- "Not your turn" - Wait for opponent
- "Position already taken" - Choose empty cell
- "Move deadline exceeded" - Too late, timeout

## Testing Scenarios

### Scenario 1: Normal Win
1. Player X makes 3 moves in a row
2. Player O makes 2 moves elsewhere
3. Game detects win
4. Backend finalizes on-chain
5. Player X receives prize

### Scenario 2: Draw
1. Players fill entire board
2. No 3-in-a-row achieved
3. Game detects draw
4. Backend cancels match on-chain
5. Both players receive refunds

### Scenario 3: Timeout
1. Player X makes first move
2. Player O waits >60 seconds
3. Timer reaches 0
4. Frontend calls check-timeout API
5. Backend declares Player O as loser
6. Player X wins and receives prize

### Scenario 4: Spectator Mode
1. Third wallet connects
2. Views active game
3. Can see board and moves
4. Cannot interact or make moves
5. See "👁️ You are spectating" message

## Troubleshooting

### "Game not initializing"
**Problem**: Match activated but game doesn't start
**Solution**:
- Check browser console for errors
- Verify CONTROLLER_KEY in backend
- Ensure match status is "Active" on-chain
- Check API endpoint `/api/game/init` response

### "Cannot make move"
**Problem**: Clicking cells doesn't work
**Solution**:
- Verify it's your turn (check badge)
- Ensure timer hasn't expired
- Check you're a player (not spectator)
- Look for error message on screen

### "Timer not updating"
**Problem**: Countdown stuck or not showing
**Solution**:
- Refresh page
- Check game status API response
- Verify moveDeadline in game state
- Check browser console for errors

### "Match doesn't finalize"
**Problem**: Game ends but no on-chain finalization
**Solution**:
- Check controller account has gas
- Verify controller permissions on contract
- Check backend logs for errors
- Ensure contract address is correct

## API Testing with curl

### Initialize Game
```bash
curl -X POST http://localhost:3000/api/game/init \
  -H "Content-Type: application/json" \
  -d '{"matchId":"1","contractAddress":"0x..."}'
```

### Get Game State
```bash
curl http://localhost:3000/api/game/state?matchId=1
```

### Make Move
```bash
curl -X POST http://localhost:3000/api/game/move \
  -H "Content-Type: application/json" \
  -d '{
    "matchId":"1",
    "playerAddress":"0x...",
    "position":4
  }'
```

### Check Timeout
```bash
curl -X POST http://localhost:3000/api/game/check-timeout \
  -H "Content-Type: application/json" \
  -d '{"matchId":"1"}'
```

## Development Tips

### Console Logging
The game logs useful debug info:
```
🎮 Game initialized: {...}
✅ Move successful: position 4
🏆 Game finished: Winner X
⏰ Timeout detected for match: 1
```

### State Inspection
In browser console:
```javascript
// Game state updates every 2 seconds
// Check Network tab for API calls
// Look for /api/game/state polls
```

### Backend Monitoring
Check terminal for backend logs:
```
🎮 Game initialized: 1
✅ Move successful: Player X, Position: 4
🏆 Finalizing match with winner: 0x...
```

## Performance Notes

- **Polling Interval**: 2 seconds (adjustable in code)
- **Timer Update**: 100ms for smooth countdown
- **Move Response**: ~100-500ms depending on network
- **Finalization**: ~2-5 seconds on testnet

## Next Steps

1. **Play a Full Game**: Test all features end-to-end
2. **Test Timeout**: Deliberately wait >60s
3. **Test Draw**: Fill board strategically
4. **Test Spectator**: Join with 3rd wallet
5. **Monitor Gas**: Check finalization costs
6. **Review Logs**: Understand flow

## Production Checklist

Before going live:
- [ ] Replace in-memory storage with database
- [ ] Implement WebSocket for real-time updates
- [ ] Add player authentication (signatures)
- [ ] Set up rate limiting
- [ ] Configure production RPC endpoint
- [ ] Deploy contracts to mainnet/L2
- [ ] Set up monitoring and alerts
- [ ] Load test with multiple games
- [ ] Security audit backend APIs
- [ ] Configure CORS properly

## Support

For issues or questions:
1. Check `GAME_ORCHESTRATION.md` for technical details
2. Review backend logs
3. Test API endpoints directly
4. Verify on-chain contract state
