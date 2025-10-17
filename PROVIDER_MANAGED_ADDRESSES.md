# Provider-Managed Contract Addresses

## Overview

The `OharaAiProvider` now centrally manages contract addresses, eliminating the need to manually pass addresses to SDK components as props. Components automatically resolve their required contract addresses from the provider context.

## Changes Made

### 1. **Enhanced OharaAiProvider**

**Added Features:**
- Contract address resolution from environment variables
- `getContractAddress(contractType)` helper function
- `addresses` object containing all resolved contract addresses

**Environment Variables Supported:**
- `NEXT_PUBLIC_GAMESCORE_ADDRESS` or `NEXT_PUBLIC_GAMESCORE_INSTANCE` → Scoreboard contract
- `NEXT_PUBLIC_GAME_MATCH_INSTANCE` or `NEXT_PUBLIC_GAME_MATCH_ADDRESS` → GameMatch contract

### 2. **Updated SDK Components**

**LeaderBoard Component:**
- `gameScoreAddress` prop is now **optional**
- Automatically resolves from `OharaAiProvider` if not provided
- Shows helpful error if address cannot be resolved

**MatchBoard Component:**
- `gameMatchAddress` prop is now **optional**
- Automatically resolves from `OharaAiProvider` if not provided
- Shows helpful error if address cannot be resolved

### 3. **Simplified Demo Apps**

**Leaderboard Demo:**
- ❌ Removed manual address management
- ❌ Removed conditional rendering based on address
- ✅ Component renders with no props needed

**Tic-Tac-Toe Demo:**
- ❌ Removed manual address management
- ❌ Removed conditional rendering for both components
- ✅ Components render with no address props

## Before vs After

### ❌ Before: Manual Address Management

```typescript
// Demo app had to manage addresses
export default function Demo() {
  const gameScoreAddress = process.env.NEXT_PUBLIC_GAMESCORE_ADDRESS as `0x${string}`
  const { address: gameMatchAddress } = useDeployedGameMatchAddress()
  
  return (
    <>
      {/* Had to check addresses and pass them */}
      {gameScoreAddress !== '0x0000...' && (
        <LeaderBoard gameScoreAddress={gameScoreAddress} />
      )}
      
      {gameMatchAddress && (
        <MatchBoard gameMatchAddress={gameMatchAddress} />
      )}
    </>
  )
}
```

### ✅ After: Automatic Resolution

```typescript
// Demo app doesn't need to manage addresses
export default function Demo() {
  return (
    <>
      {/* Addresses automatically resolved from OharaAiProvider */}
      <LeaderBoard limit={10} sortBy="wins" />
      <MatchBoard onMatchCreated={handleCreate} />
    </>
  )
}
```

## How It Works

### 1. Provider Resolves Addresses

```typescript
<OharaAiProvider>
  {/* Provider reads environment variables and makes addresses available */}
  <YourApp />
</OharaAiProvider>
```

Provider resolution logic:
```typescript
const addresses = {
  [ContractType.GAMESCORE]: 
    env.NEXT_PUBLIC_GAMESCORE_ADDRESS || env.NEXT_PUBLIC_GAMESCORE_INSTANCE,
  [ContractType.GAME_MATCH]: 
    env.NEXT_PUBLIC_GAME_MATCH_INSTANCE || env.NEXT_PUBLIC_GAME_MATCH_ADDRESS,
}
```

### 2. Components Use Context

```typescript
export function LeaderBoard({ gameScoreAddress: addressProp, ...props }) {
  const { getContractAddress } = useOharaAi()
  
  // Use prop if provided, otherwise get from context
  const gameScoreAddress = addressProp || getContractAddress(ContractType.GAMESCORE)
  
  if (!gameScoreAddress) {
    return <div>Contract address not configured</div>
  }
  
  // Use the address...
}
```

### 3. Error Handling

If an address cannot be resolved, components show a helpful error:

```
Scoreboard contract address not configured. 
Please set NEXT_PUBLIC_GAMESCORE_ADDRESS or provide gameScoreAddress prop.
```

## Benefits

1. **Centralized Management**: All contract addresses managed in one place
2. **Less Boilerplate**: No need to pass addresses everywhere
3. **Automatic Resolution**: Components get what they need from context
4. **Flexible**: Can still override with props if needed
5. **Better DX**: Cleaner component usage
6. **Type-Safe**: Full TypeScript support

## API Changes

### OharaAiProvider

**New Context Values:**
```typescript
interface OnchainContextValue {
  // ... existing properties
  
  /** Get contract address by type */
  getContractAddress: (contractType: ContractType) => `0x${string}` | undefined
  
  /** All resolved contract addresses */
  addresses: {
    [ContractType.GAMESCORE]?: `0x${string}`
    [ContractType.GAME_MATCH]?: `0x${string}`
  }
}
```

**Usage:**
```typescript
const { getContractAddress, addresses } = useOharaAi()

// Get specific address
const scoreboardAddr = getContractAddress(ContractType.GAMESCORE)

// Access all addresses
console.log(addresses)
```

### LeaderBoard Component

```typescript
interface LeaderBoardProps {
  /** Optional: If not provided, resolved from OharaAiProvider */
  gameScoreAddress?: `0x${string}`
  limit?: number
  sortBy?: 'wins' | 'prize'
  className?: string
  showStats?: boolean
}
```

### MatchBoard Component

```typescript
interface MatchBoardProps {
  /** Optional: If not provided, resolved from OharaAiProvider */
  gameMatchAddress?: `0x${string}`
  onMatchCreated?: (matchId: bigint) => void
  onMatchJoined?: (matchId: bigint) => void
  className?: string
}
```

## Usage Examples

### Example 1: Simple Usage (Most Common)

```typescript
import { LeaderBoard } from '@ohara-ai/game-sdk'

export default function MyApp() {
  return (
    <>
      {/* Address automatically resolved */}
      <LeaderBoard limit={10} />
    </>
  )
}
```

### Example 2: Override Address

```typescript
import { LeaderBoard } from '@ohara-ai/game-sdk'

export default function MyApp() {
  const customAddress = '0x123...' as `0x${string}`
  
  return (
    <>
      {/* Use custom address instead of context */}
      <LeaderBoard gameScoreAddress={customAddress} limit={10} />
    </>
  )
}
```

### Example 3: Access Addresses Programmatically

```typescript
import { useOharaAi, ContractType } from '@ohara-ai/game-sdk'

export default function MyApp() {
  const { getContractAddress, addresses } = useOharaAi()
  
  const scoreboardAddr = getContractAddress(ContractType.GAMESCORE)
  
  return (
    <div>
      <p>Scoreboard: {scoreboardAddr || 'Not configured'}</p>
      <p>GameMatch: {addresses[ContractType.GAME_MATCH] || 'Not configured'}</p>
    </div>
  )
}
```

### Example 4: Conditional Rendering Based on Availability

```typescript
import { useOharaAi, ContractType } from '@ohara-ai/game-sdk'

export default function MyApp() {
  const { getContractAddress } = useOharaAi()
  
  const hasScoreboard = !!getContractAddress(ContractType.GAMESCORE)
  const hasGameMatch = !!getContractAddress(ContractType.GAME_MATCH)
  
  return (
    <div>
      {hasGameMatch && <MatchBoard />}
      {hasScoreboard && <LeaderBoard />}
    </div>
  )
}
```

## Migration Guide

### For Demo Apps

1. **Remove address management code**
```typescript
// DELETE THIS
const gameScoreAddress = process.env.NEXT_PUBLIC_GAMESCORE_ADDRESS
const { address: gameMatchAddress } = useDeployedGameMatchAddress()
```

2. **Remove conditional rendering based on addresses**
```typescript
// DELETE THIS
{gameScoreAddress !== '0x0000...' && (
  <LeaderBoard gameScoreAddress={gameScoreAddress} />
)}

// REPLACE WITH
<LeaderBoard />
```

3. **Remove address props**
```typescript
// BEFORE
<LeaderBoard gameScoreAddress={address} limit={10} />
<MatchBoard gameMatchAddress={address} />

// AFTER
<LeaderBoard limit={10} />
<MatchBoard />
```

### For Custom Integrations

If you're building your own app with the SDK:

1. **Wrap app with OharaAiProvider** (if not already)
2. **Use components without address props** - they'll resolve automatically
3. **Set environment variables** for contract addresses
4. **(Optional)** Override with props if you need custom addresses

## Environment Setup

Ensure these environment variables are set:

```bash
# Scoreboard contract (one of these)
NEXT_PUBLIC_GAMESCORE_ADDRESS=0x...
# OR
NEXT_PUBLIC_GAMESCORE_INSTANCE=0x...

# GameMatch contract (one of these)
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x...
# OR
NEXT_PUBLIC_GAME_MATCH_ADDRESS=0x...
```

## Error Messages

If addresses are not configured, components show clear errors:

**LeaderBoard:**
```
Scoreboard contract address not configured. 
Please set NEXT_PUBLIC_GAMESCORE_ADDRESS or provide gameScoreAddress prop.
```

**MatchBoard:**
```
GameMatch contract address not configured. 
Please set NEXT_PUBLIC_GAME_MATCH_INSTANCE or provide gameMatchAddress prop.
```

## Files Modified

### SDK Files (3)
- `sdk/src/context/OnchainContext.tsx` - Added address resolution
- `sdk/src/components/LeaderBoard.tsx` - Made address optional
- `sdk/src/components/MatchBoard.tsx` - Made address optional

### Demo Apps (2)
- `app/demos/leaderboard/page.tsx` - Removed address management
- `app/demos/tic-tac-toe/page.tsx` - Removed address management

## Testing

✅ SDK type-checks pass  
✅ App type-checks pass  
✅ Components work with no props  
✅ Components work with override props  
✅ Clear error messages when addresses missing  

## Summary

The `OharaAiProvider` now acts as a central orchestrator for contract addresses, eliminating the need for components to receive addresses as props. This creates a cleaner, more maintainable codebase where contract configuration is centralized and components are simplified.

**Key Principle**: Components declare their dependencies (via registration), and the provider manages the resources (addresses) needed to fulfill those dependencies.
