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
        <OharaAiWagmiProvider>{children}</OharaAiWagmiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**How it works:** The `OharaAiWagmiProvider` automatically:

- Detects and uses wagmi's `usePublicClient`, `useWalletClient`, and `useChainId` hooks
- Passes these to the underlying `OharaAiProvider`
- Fetches contract addresses from `/api/sdk/addresses` backend (server uses configured chainId)
- Creates contract operation instances with the detected clients
- Uses `NEXT_PUBLIC_SDK_CHAIN_ID` for chain configuration

**Note:** The wallet client is optional - read-only operations (like viewing leaderboards) work without it. Write operations (like creating matches) require a connected wallet.

#### Advanced: Using OharaAiProvider Directly

For non-Wagmi setups or custom client management, use `OharaAiProvider` directly:

```tsx
import { OharaAiProvider } from '@ohara-ai/sdk';
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
      maxPlayers: 2,
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

### Operation Modes

The SDK supports two modes for server-side operations:

1. **Direct On-Chain Mode** (Default): Uses a controller private key to execute transactions directly
2. **Ohara API Mode**: Uses Ohara's managed API for deployments and controller operations

#### Direct On-Chain Mode

In this mode, the SDK executes transactions directly using a controller private key stored locally. This is the default mode when `OHARA_CONTROLLER_TOKEN` is not set.

```bash
# Controller private key is stored in public/ohara-ai-data/keys.json
# RPC_URL determines which network to use
RPC_URL=http://localhost:8545
```

#### Ohara API Mode

In this mode, the SDK delegates controller operations (activate, finalize, deployments) to the Ohara API. This is useful for managed deployments and production environments.

```bash
# Enable Ohara API mode by setting these variables:
OHARA_CONTROLLER_TOKEN=your_token_here
OHARA_API_URL=https://api.ohara.ai

# The controller address will be automatically fetched from the API
```

When Ohara API mode is enabled:

- `activate()` and `finalize()` operations are executed via the API
- `deployGameMatch()` and `deployGameScore()` use the API for deployments
- The controller address is fetched from `/v2/miniapp-controller/wallet`
- Transaction status can be tracked via the API

### Entry Points

#### Client Entry Point: `@ohara-ai/sdk`

Use this in client components and browser code:

```typescript
import { OharaAiProvider, useOharaAi } from '@ohara-ai/sdk'
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
  leave(matchId: bigint): Promise<Hash>

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
    prize: {
      address?: Address
      operations?: PrizeOperations
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
      gamePrize?: Address
    }
  }

  // Manually refresh addresses from backend
  loadAddresses(): Promise<void>
}
```

## Security & Key Management

### ⚠️ Controller Key Storage

The SDK supports two approaches for controller operations:

#### 1. **Ohara API Mode (Recommended for Production)**

Use Ohara's managed API for all controller operations. This keeps private keys secure on the backend and never exposes them to your application:

```bash
OHARA_CONTROLLER_TOKEN=your_token_here
OHARA_API_URL=https://api.ohara.ai
```

**Benefits:**
- Keys managed securely by Ohara infrastructure
- No private key exposure in your application
- Automatic transaction management and monitoring
- Suitable for production environments

#### 2. **Direct Mode (Development/Backend Only)**

In direct mode, the SDK stores a controller private key locally in `public/ohara-ai-data/keys.json`. This is intended **only** for:
- Local development with test networks (e.g., Anvil, Hardhat)
- Backend services where you control the infrastructure

**⚠️ CRITICAL SECURITY WARNINGS:**
- **NEVER** use direct mode in browser/frontend environments
- **NEVER** commit `public/ohara-ai-data/` to version control
- **NEVER** use direct mode in production without proper key management
- Keys are stored on disk and accessible to anyone with filesystem access

**Optional Encryption:**

For backend deployments using direct mode, you can enable at-rest encryption:

```bash
# Set a strong encryption secret (32+ characters recommended)
OHARA_KEY_ENCRYPTION_SECRET=your-very-secure-secret-key-here
```

When set, controller keys are encrypted using AES-256-GCM before being written to disk. This provides defense-in-depth but does **not** make local key storage production-safe.

**Best Practice:** Use Ohara API mode for any non-development environment.

## Environment Variables

### Required Variables

```bash
# RPC URL for blockchain network
RPC_URL=http://localhost:8545

# GameMatchFactory contract address
NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...

# GameScoreFactory contract address
NEXT_PUBLIC_GAME_SCORE_FACTORY=0x...
```

### Ohara API Mode (Optional)

To enable managed deployments via Ohara API:

```bash
# Ohara API authentication token
OHARA_CONTROLLER_TOKEN=your_token_here

# Ohara API base URL
OHARA_API_URL=https://api.ohara.ai
```

When both `OHARA_CONTROLLER_TOKEN` and `OHARA_API_URL` are set, the SDK automatically switches to API mode for:

- Controller operations (`activate`, `finalize`)
- Contract deployments (`deployGameMatch`, `deployGameScore`)
- Controller address resolution

### Key Encryption (Optional)

For backend deployments using direct mode, enable at-rest encryption:

```bash
# Encryption secret for controller key storage (32+ characters recommended)
OHARA_KEY_ENCRYPTION_SECRET=your-very-secure-secret-key-here
```

When set, controller keys are encrypted using AES-256-GCM. See the Security & Key Management section for important warnings.

## Error Handling

The SDK provides typed error classes for better error handling and debugging:

```typescript
import { 
  ConfigError, 
  ApiError, 
  ContractExecutionError,
  isConfigError,
  isApiError 
} from '@ohara-ai/sdk'

try {
  await game.match.operations.create(config)
} catch (error) {
  if (isConfigError(error)) {
    console.error('Configuration issue:', error.message, error.details)
  } else if (isApiError(error)) {
    console.error('API error:', error.statusCode, error.message)
  } else if (error instanceof ContractExecutionError) {
    console.error('Transaction failed:', error.txHash, error.message)
  }
}
```

**Available Error Types:**
- `ConfigError` - Configuration or environment variable issues
- `ApiError` - Ohara API communication failures (includes status code)
- `StorageError` - File system or storage errors
- `ContractExecutionError` - Blockchain transaction errors (includes tx hash)
- `ValidationError` - Invalid parameters or validation failures

All errors extend `OharaError` and include:
- `code` - Error code string for programmatic handling
- `details` - Additional context as key-value pairs
- Type guards like `isConfigError()`, `isApiError()`, etc.

## Key Features

✅ **Functional Primitives** - Simple async functions, not React components  
✅ **Type-Safe** - Full TypeScript support with typed errors  
✅ **No UI Lock-in** - Build any interface you want  
✅ **Automatic Dependency Resolution** - Provider handles contract coordination  
✅ **Fee Enforcement** - SDK coordinates on-chain requirements  
✅ **Comprehensive Error Handling** - Typed error classes for better debugging

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
    walletClient,
  )

  const scoreOps = createScoreOperations(
    '0x...', // GameScore address
    publicClient,
  )

  // Use matchOps.create(), scoreOps.getTopPlayersByWins(), etc.
}
```

**Note:** Using the provider is recommended as it handles address management, chain detection, and contract coordination automatically.

## License

MIT
