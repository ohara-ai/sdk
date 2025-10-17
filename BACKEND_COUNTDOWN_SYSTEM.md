# Backend-Coordinated Countdown System

## Overview

The match activation countdown is now managed by the backend to ensure consistency across page refreshes and multiple clients. This prevents the countdown from resetting when users refresh their browser and coordinates the exact activation timing across all players.

## Architecture

### Backend Components

#### 1. **Match Activation Storage** (`lib/server/matchActivationStorage.ts`)
- Manages countdown state in memory (can be replaced with Redis/database in production)
- Tracks when matches become full and when they should be activated
- Provides methods to start, query, cancel, and mark countdowns as complete

#### 2. **API Endpoints**

**Start Countdown** - `POST /api/match-countdown/start`
- Starts a countdown when a match becomes full
- Verifies match is actually full and in Open status
- Schedules automatic activation after specified seconds (default: 30s)
- Returns current countdown state

**Get Status** - `GET /api/match-countdown/status?matchId=X`
- Returns current countdown status for a match
- Provides remaining seconds until activation
- Indicates if match is currently activating or already activated

**Cancel Countdown** - `POST /api/match-countdown/cancel`
- Cancels an active countdown (e.g., when a player withdraws)
- Clears scheduled activation timeout

**Activate Match** - `POST /api/activate-match`
- Triggers blockchain transaction to activate the match
- Marks the match as activated in countdown storage
- Called automatically when countdown expires

### Frontend Integration

The `MatchBoard` component now:
1. **Checks for existing countdowns** when loading a match (handles page refresh)
2. **Starts backend countdown** when a match becomes full via PlayerJoined event
3. **Polls countdown status** every second to update UI
4. **Cancels countdown** when a player withdraws
5. **Disables withdrawals** during active countdown

## Flow

### Match Creation & Joining

```
1. Player 1 creates match → Match status: Open (1/2 players)
2. Player 2 joins match → Match status: Open (2/2 players)
3. Backend detects full match → Start 30s countdown
4. Backend schedules auto-activation for +30 seconds
```

### During Countdown

```
- Frontend polls backend every 1s for countdown status
- UI shows remaining time
- Withdrawals are disabled
- If player withdraws: countdown cancelled, match back to waiting
```

### Activation

```
1. Countdown reaches 0
2. Backend automatically calls activate-match API
3. Transaction sent to blockchain
4. Match status changes to Active
5. Game can begin
```

### Page Refresh Handling

```
1. User refreshes page during countdown
2. Frontend loads match info
3. Detects match is full and status is Open
4. Queries /api/match-countdown/status
5. Receives remaining seconds
6. Resumes countdown display from correct time
```

## Key Features

✅ **Persistent across refreshes** - Countdown state stored on backend  
✅ **Coordinated between players** - All clients see same countdown  
✅ **Automatic activation** - No manual intervention needed  
✅ **Withdrawal protection** - Prevents withdrawals during countdown  
✅ **Fail-safe** - If frontend misses activation, backend still executes it  

## Configuration

The countdown duration can be configured when starting:

```typescript
// Default 30 seconds
POST /api/match-countdown/start
{
  "matchId": "1",
  "contractAddress": "0x...",
  "countdownSeconds": 30  // Optional, defaults to 30
}
```

## Production Considerations

### Current Implementation
- Uses in-memory storage (Map)
- Suitable for single-server deployments
- State lost on server restart

### Production Recommendations
1. **Replace in-memory storage with Redis**
   - Shared state across multiple server instances
   - Persistence across server restarts
   - Better performance for high-traffic scenarios

2. **Add monitoring**
   - Track countdown start/completion rates
   - Alert on failed activations
   - Monitor activation API performance

3. **Add error recovery**
   - Retry logic for failed blockchain transactions
   - Handle network interruptions gracefully
   - Cleanup stale countdown states

4. **Rate limiting**
   - Prevent spam of countdown start requests
   - Protect activation API from abuse

## API Reference

### Start Countdown
```bash
curl -X POST http://localhost:3000/api/match-countdown/start \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "1",
    "contractAddress": "0x...",
    "countdownSeconds": 30
  }'
```

### Get Status
```bash
curl "http://localhost:3000/api/match-countdown/status?matchId=1"
```

### Cancel Countdown
```bash
curl -X POST http://localhost:3000/api/match-countdown/cancel \
  -H "Content-Type: application/json" \
  -d '{"matchId": "1"}'
```

## Testing

To test the countdown system:

1. Create a match with 2 players
2. Have second player join
3. Observe 30-second countdown starts
4. Refresh page → countdown should resume at correct time
5. Wait for countdown to complete → match should auto-activate
6. Or test withdrawal → countdown should cancel

## Related Files

- `lib/server/matchActivationStorage.ts` - Countdown state management
- `app/api/match-countdown/start/route.ts` - Start countdown endpoint
- `app/api/match-countdown/status/route.ts` - Get status endpoint
- `app/api/match-countdown/cancel/route.ts` - Cancel countdown endpoint
- `app/api/activate-match/route.ts` - Match activation (updated)
- `sdk/src/components/MatchBoard/index.tsx` - Frontend integration
- `sdk/src/components/MatchBoard/WaitingForPlayersView.tsx` - UI display
