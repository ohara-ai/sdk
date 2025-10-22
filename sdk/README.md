# OharaAI SDK

Functional primitives for building on-chain gaming applications. Simple async functions that abstract blockchain complexity without UI constraints.

## Installation

```bash
npm install @ohara-ai/game-sdk viem wagmi
```

## Quick Start

### 1. Setup Provider

```tsx
import { OharaAiProvider } from '@ohara-ai/game-sdk'
import { usePublicClient, useWalletClient, useChainId } from 'wagmi'

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
```

### 2. Use Primitives

```tsx
import { useOharaAi } from '@ohara-ai/game-sdk'
import { parseEther } from 'viem'

function GameComponent() {
  const { app } = useOharaAi()
  
  // Create a match
  const createMatch = async () => {
    await app.match?.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
  }
  
  // Get leaderboard
  const getTopPlayers = async () => {
    const result = await app.scores?.getTopPlayersByWins(10)
    return result
  }
  
  return (
    <div>
      <button onClick={createMatch}>Create Match</button>
      <button onClick={getTopPlayers}>View Leaderboard</button>
    </div>
  )
}
```

## Core Primitives

### Match Operations

```typescript
interface MatchOperations {
  create(config: MatchConfig): Promise<Hash>
  join(matchId: bigint): Promise<Hash>
  withdraw(matchId: bigint): Promise<Hash>
  get(matchId: bigint): Promise<Match>
  getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]>
  getPlayerStake(matchId: bigint, player: Address): Promise<bigint>
}
```

### Score Operations

```typescript
interface ScoreOperations {
  getPlayerScore(player: Address): Promise<PlayerScore>
  getTopPlayersByWins(limit: number): Promise<TopPlayersResult>
  getTopPlayersByPrize(limit: number): Promise<TopPlayersResult>
  getTotalPlayers(): Promise<bigint>
  getTotalMatches(): Promise<bigint>
}
```

### App Operations

```typescript
interface AppOperations {
  match?: MatchOperations
  scores?: ScoreOperations
  hasMatchSupport(): boolean
  hasScoreSupport(): boolean
}
```

## Environment Variables

```bash
# GameMatch contract address
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x...

# GameScore contract address
NEXT_PUBLIC_GAMESCORE_ADDRESS=0x...
```

## Key Features

✅ **Functional Primitives** - Simple async functions, not React components  
✅ **Type-Safe** - Full TypeScript support  
✅ **No UI Lock-in** - Build any interface you want  
✅ **Automatic Dependency Resolution** - Provider handles contract coordination  
✅ **Fee Enforcement** - SDK coordinates on-chain requirements  

## Direct Usage

You can also use primitives directly without the provider:

```tsx
import { createMatchOperations, createScoreOperations } from '@ohara-ai/game-sdk'
import { usePublicClient, useWalletClient } from 'wagmi'

function Component() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const match = createMatchOperations(
    '0x...', // GameMatch address
    publicClient,
    walletClient
  )
  
  const scores = createScoreOperations(
    '0x...', // GameScore address
    publicClient
  )
  
  // Use match.create(), scores.getTopPlayersByWins(), etc.
}
```

## Development

```bash
# Build the SDK
npm run build

# Watch mode
npm run dev
```

## License

MIT
