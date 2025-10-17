# SDK Integration Guide

This guide explains how to integrate the Ohara AI Game SDK into your own applications.

## Installation

### Option 1: From NPM (when published)

```bash
npm install @ohara-ai/game-sdk viem wagmi @tanstack/react-query
```

### Option 2: Local Development

```bash
# Clone the repository
git clone <repository-url>
cd on-chain-features

# Install SDK dependencies
npm run sdk:install

# Build the SDK
npm run sdk:build

# In your app, link to the local SDK
cd your-app
npm link ../on-chain-features/sdk
```

## Setup

### 1. Configure Wagmi Provider

The SDK components require wagmi for blockchain interactions. Set up your app's root with the necessary providers:

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 2. Import Styles (if needed)

If you're not using TailwindCSS in your project, you may need to configure it:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update your `tailwind.config.js`:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@ohara-ai/game-sdk/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Components

### LeaderBoard

Display player rankings and scores from a GameScore contract.

```tsx
import { LeaderBoard } from '@ohara-ai/game-sdk'

function MyApp() {
  return (
    <LeaderBoard 
      gameScoreAddress="0x..." 
      limit={10}
      sortBy="wins"
      showStats={true}
      className="my-custom-class"
    />
  )
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gameScoreAddress` | `0x${string}` | Required | The address of the GameScore contract |
| `limit` | `number` | `10` | Maximum number of entries to display |
| `sortBy` | `'wins' \| 'prize'` | `'wins'` | Sort by total wins or total prize |
| `showStats` | `boolean` | `true` | Show total players and matches statistics |
| `className` | `string` | - | Additional CSS classes |

### MatchBoard

Allow users to create and join wagered matches.

```tsx
import { MatchBoard } from '@ohara-ai/game-sdk'

function MyApp() {
  const handleMatchCreated = (matchId: bigint) => {
    console.log('Match created:', matchId)
    // Start your game logic
  }

  const handleMatchJoined = (matchId: bigint) => {
    console.log('Joined match:', matchId)
    // Start your game logic
  }

  return (
    <MatchBoard 
      gameMatchAddress="0x..."
      onMatchCreated={handleMatchCreated}
      onMatchJoined={handleMatchJoined}
      className="my-custom-class"
    />
  )
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gameMatchAddress` | `0x${string}` | Required | The address of the GameMatch contract |
| `onMatchCreated` | `(matchId: bigint) => void` | - | Callback when a match is created |
| `onMatchJoined` | `(matchId: bigint) => void` | - | Callback when a match is joined |
| `className` | `string` | - | Additional CSS classes |

## Contract ABIs

The SDK exports contract ABIs for direct interaction:

```tsx
import { GAME_MATCH_ABI, GAMESCORE_ABI } from '@ohara-ai/game-sdk'

// Use with wagmi hooks
import { useReadContract } from 'wagmi'

const { data } = useReadContract({
  address: '0x...',
  abi: GAME_MATCH_ABI,
  functionName: 'getMatch',
  args: [matchId],
})
```

## Utility Functions

```tsx
import { formatAddress, formatTokenAmount, cn } from '@ohara-ai/game-sdk'

// Format addresses
formatAddress('0x1234567890123456789012345678901234567890')
// Returns: "0x1234...7890"

// Format token amounts
formatTokenAmount(BigInt('1000000000000000000')) // 1 ETH
// Returns: "1.0000"

// Combine CSS classes
cn('base-class', 'conditional-class', { 'dynamic-class': true })
```

## Example: Complete Game Integration

```tsx
'use client'

import { useState } from 'react'
import { LeaderBoard, MatchBoard } from '@ohara-ai/game-sdk'

export default function MyGame() {
  const [currentMatchId, setCurrentMatchId] = useState<bigint | null>(null)

  const gameMatchAddress = '0x...' as `0x${string}`
  const gameScoreAddress = '0x...' as `0x${string}`

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Awesome Game</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Area */}
        <div>
          {currentMatchId ? (
            <div>
              <h2>Playing Match #{currentMatchId.toString()}</h2>
              {/* Your game logic here */}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Create or join a match to start playing
            </div>
          )}
        </div>

        {/* Wagering */}
        <MatchBoard
          gameMatchAddress={gameMatchAddress}
          onMatchCreated={setCurrentMatchId}
          onMatchJoined={setCurrentMatchId}
        />
      </div>

      {/* Leaderboard */}
      <div className="mt-8">
        <LeaderBoard
          gameScoreAddress={gameScoreAddress}
          limit={10}
          sortBy="wins"
        />
      </div>
    </div>
  )
}
```

## Best Practices

1. **Error Handling**: Always wrap SDK components in error boundaries
2. **Loading States**: The components handle their own loading states, but you may want to add suspense boundaries
3. **Wallet Connection**: Ensure users connect their wallets before showing wagering components
4. **Contract Deployment**: Deploy and configure contracts before using the SDK
5. **Environment Variables**: Store contract addresses in environment variables for easy configuration

## Troubleshooting

### Components not rendering

- Ensure you have wrapped your app with `WagmiProvider` and `QueryClientProvider`
- Check that contract addresses are valid and contracts are deployed

### Styling issues

- Ensure TailwindCSS is properly configured
- Check that the SDK's content path is included in your `tailwind.config.js`

### Transaction failures

- Verify the user has sufficient balance
- Check that the GameMatch contract has proper permissions
- Ensure the connected wallet matches the expected network

## Support

For issues and questions:
- Check the [examples in the demo app](../app/demos)
- Review the [SDK source code](../sdk/src)
- Open an issue on GitHub
