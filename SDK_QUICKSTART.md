# OharaAI SDK Quick Start

The OharaAI SDK provides functional primitives for building on-chain gaming applications without dealing with blockchain complexity directly.

## Core Concepts

The SDK exposes three main primitives:

1. **Match** - Create, join, and manage wagered game matches
2. **Scores** - Query player statistics and leaderboards  
3. **App** - High-level interface combining Match + Scores operations

## Installation

```bash
npm install @ohara-ai/game-sdk viem wagmi
```

## Setup

### 1. Configure Providers

Wrap your app with `OharaAiProvider` and pass wagmi clients:

```tsx
import { OharaAiProvider } from '@ohara-ai/game-sdk'
import { WagmiProvider, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'

function AppProviders({ children }) {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  
  return (
    <OharaAiProvider 
      publicClient={publicClient}
      walletClient={walletClient}
      chainId={chainId}
    >
      {children}
    </OharaAiProvider>
  )
}

export function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppProviders>{children}</AppProviders>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 2. Set Contract Addresses

Configure contract addresses via environment variables:

```bash
# .env.local
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x...
NEXT_PUBLIC_GAMESCORE_ADDRESS=0x...
```

## Usage Examples

### Using the App Primitive (Recommended)

The `app` primitive provides the easiest way to interact with on-chain features:

```tsx
import { useOharaAi } from '@ohara-ai/game-sdk'
import { parseEther } from 'viem'

function GameComponent() {
  const { app } = useOharaAi()
  
  // Check what's available
  const hasMatches = app.hasMatchSupport()
  const hasScores = app.hasScoreSupport()
  
  const createMatch = async () => {
    if (!app.match) return
    
    // Create a match
    const hash = await app.match.create({
      token: '0x0000000000000000000000000000000000000000', // Native token (ETH)
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
    
    console.log('Match created:', hash)
  }
  
  const joinMatch = async (matchId: bigint) => {
    if (!app.match) return
    
    const hash = await app.match.join(matchId)
    console.log('Joined match:', hash)
  }
  
  const getTopPlayers = async () => {
    if (!app.scores) return
    
    const result = await app.scores.getTopPlayersByWins(10)
    console.log('Top players:', result)
  }
  
  return (
    <div>
      {hasMatches && <button onClick={createMatch}>Create Match</button>}
      {hasScores && <button onClick={getTopPlayers}>View Leaderboard</button>}
    </div>
  )
}
```

### Using Match Primitive Directly

For more control, use primitives directly:

```tsx
import { createMatchOperations } from '@ohara-ai/game-sdk'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseEther } from 'viem'

function MatchManager() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const gameMatchAddress = '0x...' // Your GameMatch contract address
  const match = createMatchOperations(
    gameMatchAddress,
    publicClient,
    walletClient
  )
  
  const handleCreateMatch = async () => {
    // Create a 2-player match with 0.1 ETH stake
    const hash = await match.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
    
    console.log('Transaction:', hash)
  }
  
  const loadMatch = async (matchId: bigint) => {
    // Get match details
    const matchData = await match.get(matchId)
    console.log('Match data:', matchData)
    
    // Get active matches
    const activeMatches = await match.getActiveMatches(0, 10)
    console.log('Active matches:', activeMatches)
  }
  
  return <div>...</div>
}
```

### Using Scores Primitive Directly

```tsx
import { createScoreOperations } from '@ohara-ai/game-sdk'
import { usePublicClient } from 'wagmi'

function Leaderboard() {
  const publicClient = usePublicClient()
  const gameScoreAddress = '0x...'
  
  const scores = createScoreOperations(gameScoreAddress, publicClient)
  
  const [topPlayers, setTopPlayers] = useState(null)
  
  useEffect(() => {
    async function loadLeaderboard() {
      // Get top 10 players by wins
      const result = await scores.getTopPlayersByWins(10)
      setTopPlayers(result)
      
      // Get top players by prize money
      const byPrize = await scores.getTopPlayersByPrize(10)
      console.log('Top earners:', byPrize)
    }
    
    loadLeaderboard()
  }, [])
  
  return (
    <div>
      {topPlayers && (
        <ul>
          {topPlayers.players.map((player, i) => (
            <li key={player}>
              {player}: {topPlayers.wins[i].toString()} wins
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

## API Reference

### Match Operations

```typescript
interface MatchOperations {
  // Create a new match
  create(config: MatchConfig): Promise<Hash>
  
  // Join an existing match
  join(matchId: bigint): Promise<Hash>
  
  // Withdraw stake from a match
  withdraw(matchId: bigint): Promise<Hash>
  
  // Get match details
  get(matchId: bigint): Promise<Match>
  
  // Get active matches (paginated)
  getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]>
  
  // Get player's stake in a match
  getPlayerStake(matchId: bigint, player: Address): Promise<bigint>
}
```

### Score Operations

```typescript
interface ScoreOperations {
  // Get a player's score data
  getPlayerScore(player: Address): Promise<PlayerScore>
  
  // Get top players by wins
  getTopPlayersByWins(limit: number): Promise<TopPlayersResult>
  
  // Get top players by prize money
  getTopPlayersByPrize(limit: number): Promise<TopPlayersResult>
  
  // Get total number of players tracked
  getTotalPlayers(): Promise<bigint>
  
  // Get total number of matches played
  getTotalMatches(): Promise<bigint>
}
```

### App Operations

```typescript
interface AppOperations {
  // Match operations (undefined if not configured)
  match?: MatchOperations
  
  // Score operations (undefined if not configured)
  scores?: ScoreOperations
  
  // Check if match operations are available
  hasMatchSupport(): boolean
  
  // Check if score operations are available
  hasScoreSupport(): boolean
}
```

## Key Features

✅ **No Blockchain Complexity** - Work with simple async functions, not raw contract calls  
✅ **Type-Safe** - Full TypeScript support with proper types  
✅ **Automatic Dependency Resolution** - Provider handles contract address management  
✅ **Flexible** - Use high-level `app` primitive or low-level operations directly  
✅ **Minimal** - No opinionated UI, build your own interface  

## Next Steps

- Check out the [contract testing demo](/app/contract-testing) to see the SDK in action
- Read the [full SDK documentation](/sdk/README.md)
- Explore the [contract source code](/contracts/src)

## License

MIT
