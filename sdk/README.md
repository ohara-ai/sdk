# OharaAI SDK

Functional primitives for building on-chain applications. Simple async functions that abstract blockchain complexity without UI constraints.

## Installation

This SDK is used through npm package `@ohara-ai/sdk`.

```tsx
import { OharaAiProvider, useOharaAi } from '@ohara-ai/sdk'
import { createServerOharaAi } from '@ohara-ai/sdk/server'
```

For external projects, make sure you have npmrc configured through doppler to use GitHub's npm and then install via npm:

```bash
npm install @ohara-ai/sdk viem wagmi
```

## Quick Start

### 1. Setup Provider

Use the simplified `OharaAiWagmiProvider` that automatically bridges Wagmi hooks:

```tsx
'use client'

import { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OharaAiWagmiProvider } from '@ohara-ai/sdk'
import { config } from '@/lib/wagmi'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OharaAiWagmiProvider>
          {children}
        </OharaAiWagmiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**How it works:** The `OharaAiWagmiProvider` automatically:
- Detects and uses wagmi's `usePublicClient`, `useWalletClient`, and `useChainId` hooks
- Passes these to the underlying `OharaAiProvider`
- Fetches contract addresses from `/api/sdk/addresses?chainId=<chainId>` backend
- Creates contract operation instances with the detected clients
- Manages chain-specific contract state

**Note:** The wallet client is optional - read-only operations (like viewing leaderboards) work without it. Write operations (like creating matches) require a connected wallet.

#### Advanced: Using OharaAiProvider Directly

For non-Wagmi setups or custom client management, use `OharaAiProvider` directly:

```tsx
import { OharaAiProvider } from '@ohara-ai/sdk'

<OharaAiProvider 
  publicClient={yourPublicClient}
  walletClient={yourWalletClient}
  chainId={yourChainId}
>
  {children}
</OharaAiProvider>
```

### 2. Use the SDK

Access operations through the hierarchical context structure:

```tsx
import { useOharaAi } from '@ohara-ai/sdk'
import { parseEther } from 'viem'

function GameComponent() {
  const { game } = useOharaAi()
  
  // Create a match
  const createMatch = async () => {
    if (!game.match.operations) {
      throw new Error('Match operations not available')
    }
    
    const hash = await game.match.operations.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
    
    return hash
  }
  
  // Get leaderboard
  const getTopPlayers = async () => {
    if (!game.scores.operations) {
      throw new Error('Score operations not available')
    }
    
    const result = await game.scores.operations.getTopPlayersByWins(10)
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

## Server-Side Usage

The SDK has separate entry points for client and server code to prevent Node.js-specific modules (like `fs`) from being bundled in client-side code.

### Entry Points

#### Client Entry Point: `@ohara-ai/sdk`
Use this in client components and browser code:
```typescript
import { 
  OharaAiProvider, 
  useOharaAi
} from '@ohara-ai/sdk'
```

#### Server Entry Point: `@ohara-ai/sdk/server`
Use this in API routes, server actions, and server components:
```typescript
import { 
  getContracts,
  updateContracts,
  setContractAddress,
  getControllerKey,
  getControllerAddress,
  deployGameMatch,
  deployGameScore,
  createServerOharaAi,
  // ... other server-only exports
} from '@ohara-ai/sdk/server'
```

### Examples

**Client Component:**
```typescript
'use client'
import { useOharaAi } from '@ohara-ai/sdk'

export function MyComponent() {
  const { game } = useOharaAi()
  // ...
}
```

**API Route:**
```typescript
import { createServerOharaAi, deployGameMatch } from '@ohara-ai/sdk/server'

export async function POST(request: Request) {
  // Create server context with controller wallet
  const { game } = await createServerOharaAi()
  
  // Access server-only operations (activate, finalize)
  if (game.match.operations) {
    const hash = await game.match.operations.activate(matchId)
  }
  
  // Or deploy new contracts
  const result = await deployGameMatch({ gameScoreAddress: '0x...' })
  return Response.json(result)
}
```

**❌ Don't import server-only exports in client components:**
```typescript
'use client'
// This will cause "Module not found: Can't resolve 'fs/promises'" error
import { getContracts } from '@ohara-ai/sdk/server'
```

## Core Primitives

### Match Operations

**Client-side operations** (available via `useOharaAi()`):

```typescript
interface MatchOperations {
  // Write operations (require user wallet)
  create(config: MatchConfig): Promise<Hash>
  join(matchId: bigint): Promise<Hash>
  withdraw(matchId: bigint): Promise<Hash>
  
  // Read operations
  get(matchId: bigint): Promise<Match>
  getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]>
  getActiveMatchCount(): Promise<bigint>
  getMaxActiveMatches(): Promise<bigint>
  getPlayerStake(matchId: bigint, player: Address): Promise<bigint>
  getFeeConfiguration(): Promise<{
    recipients: readonly Address[]
    shares: readonly bigint[]
    totalShare: bigint
  }>
}
```

**Server-only operations** (available via `createServerOharaAi()`):

```typescript
interface ServerMatchOperations extends MatchOperations {
  // Controller-only operations (require controller wallet)
  activate(matchId: bigint): Promise<Hash>
  finalize(matchId: bigint, winner: Address): Promise<Hash>
}
```

### Score Operations

```typescript
interface ScoreOperations {
  // Player and leaderboard queries
  getPlayerScore(player: Address): Promise<PlayerScore>
  getTopPlayersByWins(limit: number): Promise<TopPlayersResult>
  getTopPlayersByPrize(limit: number): Promise<TopPlayersResult>
  
  // System stats
  getTotalPlayers(): Promise<bigint>
  getTotalMatches(): Promise<bigint>
  getMaxLosersPerMatch(): Promise<bigint>
  getMaxTotalPlayers(): Promise<bigint>
  getMaxTotalMatches(): Promise<bigint>
}
```

### Context Structure

The SDK uses a hierarchical context structure:

```typescript
interface OharaAiContext {
  // Game contracts and operations
  game: {
    match: {
      address?: Address
      operations?: MatchOperations
    }
    scores: {
      address?: Address
      operations?: ScoreOperations
    }
  }
  
  // Ohara-managed contracts
  ohara: {
    contracts: {
      token?: Address
    }
  }
  
  // Application-level contracts
  app: {
    coin: { address?: Address }
    controller: { address?: Address }
  }
  
  // Internal config (factories, chainId)
  internal: {
    chainId?: number
    factories?: {
      gameMatch?: Address
      gameScore?: Address
    }
  }
  
  // Manually refresh addresses from backend
  loadAddresses(): Promise<void>
}
```

## Environment Variables

```bash
# GameMatchFactory contract address
NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...

# GameScoreFactory contract address
NEXT_PUBLIC_GAME_SCORE_FACTORY=0x...
```

## Key Features

✅ **Functional Primitives** - Simple async functions, not React components  
✅ **Type-Safe** - Full TypeScript support  
✅ **No UI Lock-in** - Build any interface you want  
✅ **Automatic Dependency Resolution** - Provider handles contract coordination  
✅ **Fee Enforcement** - SDK coordinates on-chain requirements  

## Direct Usage (Advanced)

You can create operations directly without the provider:

```tsx
import { createClientMatchOperations } from '@ohara-ai/sdk'
import { createScoreOperations } from '@ohara-ai/sdk'
import { usePublicClient, useWalletClient } from 'wagmi'

function Component() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const matchOps = createClientMatchOperations(
    '0x...', // GameMatch address
    publicClient,
    walletClient
  )
  
  const scoreOps = createScoreOperations(
    '0x...', // GameScore address
    publicClient
  )
  
  // Use matchOps.create(), scoreOps.getTopPlayersByWins(), etc.
}
```

**Note:** Using the provider is recommended as it handles address management, chain detection, and contract coordination automatically.

## License

MIT
