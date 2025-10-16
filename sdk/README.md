# @ohara-ai/game-sdk

Production-ready UI components and hooks for building on-chain gaming applications.

## Installation

```bash
npm install @ohara-ai/game-sdk viem wagmi
```

## Components

### LeaderBoard

Display high scores and player rankings from ScoreBoard contracts.

```tsx
import { LeaderBoard } from '@ohara-ai/game-sdk'

function App() {
  return (
    <LeaderBoard 
      scoreBoardAddress="0x..."
      limit={10}
      sortBy="wins"
    />
  )
}
```

**Props:**
- `scoreBoardAddress` (string): The address of the ScoreBoard contract
- `limit` (number, optional): Maximum number of entries to display (default: 10)
- `sortBy` ('wins' | 'score' | 'recent', optional): Sorting criteria (default: 'wins')
- `className` (string, optional): Additional CSS classes

### WageringBox

Create and join wagered game matches with escrow management.

```tsx
import { WageringBox } from '@ohara-ai/game-sdk'

function App() {
  return (
    <WageringBox 
      gameMatchAddress="0x..."
      onMatchCreated={(id) => console.log('Match created:', id)}
      onMatchJoined={(id) => console.log('Joined match:', id)}
    />
  )
}
```

**Props:**
- `gameMatchAddress` (string): The address of the GameMatch contract
- `onMatchCreated` (function, optional): Callback when a match is created
- `onMatchJoined` (function, optional): Callback when a match is joined
- `className` (string, optional): Additional CSS classes

## Setup

The SDK components require a wagmi provider. Wrap your app with `WagmiProvider`:

```tsx
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* Your app */}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Development

```bash
# Build the package
npm run build

# Watch mode for development
npm run dev

# Type check
npm run type-check
```

## License

MIT
