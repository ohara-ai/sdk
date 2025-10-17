# Reactive Contract Address Resolution

## Problem Solved

The `OharaAiProvider` was only reading contract addresses from static environment variables (`process.env`), which are set at build time. When contracts were deployed through the contract testing page and stored in localStorage, the provider wasn't detecting these changes, causing components to show "contract not configured" errors.

## Solution Implemented

Made the `OharaAiProvider` **reactive** to contract deployments by:

1. **Reading from localStorage** with chain-specific keys
2. **Listening for changes** via storage events and custom events
3. **Prioritizing dynamic addresses** (localStorage) over static env vars
4. **Auto-detecting chain ID** from wagmi context

## How It Works

### 1. Provider Reads from Multiple Sources

```typescript
// Priority order (highest to lowest):
1. localStorage (deployed_game_match_{chainId}, deployed_scoreboard_{chainId})
2. Environment variables (NEXT_PUBLIC_SCOREBOARD_ADDRESS, etc.)
```

### 2. Reactive Updates

The provider listens for:
- **Storage events**: Changes to localStorage (cross-tab)
- **Custom events**: `contractDeployed` event for same-window updates
- **Chain changes**: Automatically reloads addresses when chain ID changes

### 3. Automatic Chain Detection

```typescript
<OharaAiProvider chainId={useChainId()}>
  <YourApp />
</OharaAiProvider>
```

Chain ID from wagmi is automatically passed to the provider, ensuring the correct localStorage keys are used.

### 4. Event Dispatch on Deployment

When a contract is deployed via `useDeployedAddress`:

```typescript
localStorage.setItem(`deployed_game_match_${chainId}`, address)
window.dispatchEvent(new CustomEvent('contractDeployed', {
  detail: { address, storageKey }
}))
```

## Changes Made

### 1. **Enhanced OharaAiProvider** (`sdk/src/context/OnchainContext.tsx`)

**Added:**
- `chainId` prop for chain-specific address lookup
- `storageAddresses` state for localStorage-based addresses
- `useEffect` to read from localStorage reactively
- Event listeners for `storage` and `contractDeployed` events
- Address merging logic (localStorage > env vars)

**Key Features:**
```typescript
export function OharaAiProvider({ 
  children, 
  env = process.env,
  chainId  // New: Chain ID for localStorage keys
}: OharaAiProviderProps)
```

### 2. **Updated Providers.tsx** (`components/Providers.tsx`)

**Added wrapper to pass chainId:**
```typescript
function OharaAiProviderWrapper({ children }) {
  const chainId = useChainId()  // Get from wagmi
  
  return (
    <OharaAiProvider chainId={chainId}>
      {children}
    </OharaAiProvider>
  )
}
```

### 3. **Enhanced useDeployedAddress** (`lib/hooks/useDeployedAddress.ts`)

**Added event dispatch:**
```typescript
const setAddress = (newAddress) => {
  // ... set to localStorage
  
  // Notify provider of change
  window.dispatchEvent(new CustomEvent('contractDeployed', {
    detail: { address: newAddress, storageKey }
  }))
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Contract Testing Page                        │
│                                                                 │
│  1. User deploys contract                                       │
│  2. useDeployedAddress.setAddress(address)                     │
│  3. localStorage.setItem(`deployed_game_match_${chainId}`)     │
│  4. window.dispatchEvent('contractDeployed')                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OharaAiProvider                            │
│                                                                 │
│  1. Hears 'contractDeployed' event                             │
│  2. Reloads addresses from localStorage                        │
│  3. Updates context with new addresses                         │
│  4. Triggers re-render of consumers                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SDK Components                               │
│                                                                 │
│  LeaderBoard, MatchBoard automatically get new addresses      │
│  Components re-render with valid addresses                     │
└─────────────────────────────────────────────────────────────────┘
```

## Address Priority

The provider uses this priority order when resolving addresses:

```typescript
// For each contract type:
const address = 
  storageAddresses[contractType] ||      // 1. localStorage (highest priority)
  env.NEXT_PUBLIC_CONTRACT_ADDRESS ||    // 2. Environment variable
  undefined                               // 3. Not configured
```

This ensures:
- ✅ Dynamically deployed contracts take precedence
- ✅ Environment variables serve as fallback
- ✅ Build-time and runtime addresses work together

## localStorage Keys

The provider reads from these chain-specific keys:

```
deployed_game_match_{chainId}     → GameMatch contract
deployed_scoreboard_{chainId}     → Scoreboard contract
```

Examples:
```
deployed_game_match_31337        (Local Anvil)
deployed_game_match_1            (Ethereum Mainnet)
deployed_scoreboard_31337        (Local Anvil)
```

## Benefits

1. **Real-time Updates**: Components immediately reflect deployed contracts
2. **No Page Refresh**: Changes propagate automatically via events
3. **Chain Awareness**: Different addresses per chain
4. **Cross-Tab Sync**: Storage events keep multiple tabs in sync
5. **Backwards Compatible**: Still works with env vars
6. **Zero Configuration**: Just deploy contracts, provider handles the rest

## Testing

### Test Scenario 1: Deploy Contract

1. Visit `/contract-testing`
2. Deploy a contract (e.g., ScoreBoard)
3. Navigate to `/demos/leaderboard`
4. ✅ LeaderBoard component should automatically use the new address

### Test Scenario 2: Chain Switch

1. Deploy contracts on chain A
2. Switch to chain B in wallet
3. ✅ Provider loads addresses for chain B
4. Deploy contracts on chain B
5. ✅ Components use chain B addresses

### Test Scenario 3: Multiple Tabs

1. Open demo in Tab 1
2. Open contract testing in Tab 2
3. Deploy contract in Tab 2
4. ✅ Tab 1 automatically updates (via storage event)

## Migration

**No changes required for existing code!** The provider enhancement is backwards compatible:

- Environment variables still work
- Props still work for manual override
- localStorage is an additional source, not a replacement

## Debug Tips

### Check Current Addresses

```typescript
import { useOharaAi } from '@ohara-ai/game-sdk'

function DebugAddresses() {
  const { addresses } = useOharaAi()
  
  return (
    <pre>
      {JSON.stringify(addresses, null, 2)}
    </pre>
  )
}
```

### Verify localStorage

```javascript
// In browser console
localStorage.getItem('deployed_game_match_31337')
localStorage.getItem('deployed_scoreboard_31337')
```

### Test Event Dispatch

```javascript
// Manually trigger address reload
window.dispatchEvent(new CustomEvent('contractDeployed'))
```

## API Changes

### OharaAiProvider

**New Props:**
```typescript
interface OharaAiProviderProps {
  children: ReactNode
  env?: Record<string, string | undefined>
  chainId?: number  // NEW: Chain ID for localStorage lookup
}
```

**New Behavior:**
- Reads from localStorage automatically
- Listens for storage and custom events
- Reactive to chain ID changes

### useOharaAi

**No API changes** - same interface, just more reactive:
```typescript
const { addresses, getContractAddress } = useOharaAi()
// Now reflects localStorage + env vars
```

## Files Modified

1. **sdk/src/context/OnchainContext.tsx**
   - Added localStorage reading logic
   - Added event listeners
   - Added chain ID support
   - Added address merging

2. **components/Providers.tsx**
   - Added wrapper to pass chainId from wagmi
   - Ensures provider gets current chain context

3. **lib/hooks/useDeployedAddress.ts**
   - Added custom event dispatch
   - Notifies provider when addresses change

## Performance

- **Minimal overhead**: Event listeners only for contract-related keys
- **Optimized re-renders**: Uses `useMemo` for address resolution
- **No polling**: Event-driven updates only
- **Efficient validation**: Only recalculates when dependencies change

## Summary

The `OharaAiProvider` is now **fully reactive** to contract deployments. When you deploy contracts through the contract testing page:

1. ✅ Addresses are stored in localStorage (chain-specific)
2. ✅ Custom event is dispatched
3. ✅ Provider automatically detects the change
4. ✅ Components re-render with new addresses
5. ✅ No page refresh needed

**Result**: Seamless developer experience where deployed contracts "just work" across the entire application.
