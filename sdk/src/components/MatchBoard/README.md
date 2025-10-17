# MatchBoard Component

A refactored, modular implementation of the MatchBoard component for managing game matches.

## Structure

```
MatchBoard/
├── index.tsx                    # Main component with business logic
├── types.ts                     # Shared TypeScript interfaces
├── NoActiveMatchView.tsx        # View for browsing/creating matches
├── WaitingForPlayersView.tsx    # View when waiting for players
├── MatchActiveView.tsx          # View when match is active
└── README.md                    # This file
```

## Components

### Main Component (`index.tsx`)
- **MatchBoard**: The main component that orchestrates all views
- Handles wallet connection, contract interactions, and state management
- Automatically switches between views based on match state
- Integrates with wagmi hooks for blockchain interactions

### View Components

#### `NoActiveMatchView`
Displayed when the user has no active match.
- Lists available matches to join (ETH and ERC20)
- Provides a form to create new matches
- Handles stake amount and max players configuration

#### `WaitingForPlayersView`
Displayed when user has joined a match that's still open.
- Shows current participants and empty slots
- Displays match details (stake, total pool)
- Allows withdrawal before match activation

#### `MatchActiveView`
Displayed when the match is active or finalized.
- Shows all participants
- Displays match status and pool information
- No withdrawal allowed (stakes are locked)

## Types

### `MatchBoardProps`
- `gameMatchAddress?`: Contract address (optional, resolved from context)
- `presetMaxPlayers?`: Fixed number of players (prevents user modification)
- `onMatchCreated?`: Callback when match is created
- `onMatchJoined?`: Callback when match is joined
- `className?`: Additional CSS classes

### `MatchInfo`
Complete match data structure including:
- ID, token, stake amount, max players
- Current players array
- Status, winner, creation timestamp

## Usage

```tsx
import { MatchBoard } from '@/sdk/src/components/MatchBoard'

function GamePage() {
  return (
    <MatchBoard
      presetMaxPlayers={2}
      onMatchCreated={(matchId) => console.log('Created:', matchId)}
      onMatchJoined={(matchId) => console.log('Joined:', matchId)}
    />
  )
}
```

## Backward Compatibility

The old `MatchBoard.tsx` file still exists as a re-export for backward compatibility with existing imports.

## Features

- **Auto-activation**: Matches automatically activate when full
- **Real-time updates**: Uses wagmi's `useWatchContractEvent` for live updates
- **Wallet integration**: Seamlessly integrates with wallet context
- **Error handling**: Displays user-friendly error messages
- **Loading states**: Shows appropriate loading indicators
- **Responsive UI**: Clean, modern interface with Tailwind CSS
