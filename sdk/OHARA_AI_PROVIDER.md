# OharaAiProvider - Automatic Contract Dependency Detection

## Overview

The `OharaAiProvider` automatically tracks which SDK components are mounted in your React tree and determines contract dependencies dynamically. **No explicit configuration needed** - just wrap your app and render components.

## Quick Start

### 1. Wrap Your App

```typescript
// app/layout.tsx or components/Providers.tsx
import { OharaAiProvider } from '@ohara-ai/game-sdk'

export function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OharaAiProvider>
          {children}
        </OharaAiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 2. Use SDK Components

```typescript
// app/demos/your-demo/page.tsx
import { LeaderBoard, MatchBoard } from '@ohara-ai/game-sdk'

export default function YourDemo() {
  return (
    <div>
      {/* Components automatically register their dependencies */}
      <MatchBoard gameMatchAddress={address} />
      <LeaderBoard scoreBoardAddress={address} />
    </div>
  )
}
```

### 3. Display Dependency Info (Optional)

```typescript
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'

export default function YourDemo() {
  return (
    <div>
      {/* Shows which components are active and their contract needs */}
      <ContractDependencyInfo />
      
      <MatchBoard gameMatchAddress={address} />
      <LeaderBoard scoreBoardAddress={address} />
    </div>
  )
}
```

## How It Works

### Automatic Registration

Each SDK component automatically registers itself when mounted:

```typescript
export function LeaderBoard({ scoreBoardAddress, ...props }) {
  // Auto-registers on mount, unregisters on unmount
  useComponentRegistration('LeaderBoard')
  
  // Component logic...
}
```

### Dynamic Dependency Detection

The provider tracks active components and calculates dependencies:

```typescript
// Internally, the provider does:
const activeComponents = ['LeaderBoard', 'MatchBoard']
const dependencies = getContractDependencies(activeComponents)
// Returns: [Scoreboard, GameMatch] contracts
```

### Conditional Rendering

Dependencies are only required if components are actually rendered:

```typescript
export default function Demo() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  
  return (
    <div>
      <MatchBoard gameMatchAddress={address} />
      {/* Scoreboard contract only required if this renders */}
      {showLeaderboard && (
        <LeaderBoard scoreBoardAddress={address} />
      )}
    </div>
  )
}
```

## API Reference

### `<OharaAiProvider>`

Provider component that tracks SDK components and manages dependencies.

**Props:**
- `children: ReactNode` - Your app content
- `env?: Record<string, string>` - Environment variables (defaults to `process.env`)

**Example:**
```typescript
<OharaAiProvider>
  <YourApp />
</OharaAiProvider>
```

### `useOharaAi()`

Hook to access dependency information.

**Returns:**
```typescript
{
  activeComponents: Set<ComponentName>  // Currently mounted SDK components
  dependencies: ContractDependency[]     // All required contracts
  validation: {
    valid: boolean                       // Are all required contracts configured?
    missing: ContractDependency[]        // Missing contracts
    configured: ContractDependency[]     // Properly configured contracts
  }
  registerComponent: (name) => void      // Manually register a component
  unregisterComponent: (name) => void    // Manually unregister a component
  env: Record<string, string>            // Environment variables
}
```

**Example:**
```typescript
function MyComponent() {
  const { validation, activeComponents } = useOharaAi()
  
  return (
    <div>
      <p>Active components: {Array.from(activeComponents).join(', ')}</p>
      {!validation.valid && (
        <p>Missing: {validation.missing.map(m => m.contract).join(', ')}</p>
      )}
    </div>
  )
}
```

### `useComponentRegistration()`

Hook used internally by SDK components for automatic registration.

**Parameters:**
- `componentName: ComponentName` - Name of the component to register

**Example:**
```typescript
export function MyComponent() {
  useComponentRegistration('MyComponent')
  // Component automatically registers/unregisters on mount/unmount
}
```

## Advantages Over Explicit Config

### Before (Explicit Config)
```typescript
// ❌ Must manually maintain config file
// app/demos/your-demo/config.ts
export const DEMO_CONFIG = {
  components: ['LeaderBoard', 'MatchBoard']
}

// app/demos/your-demo/page.tsx
import { useContractDependencies } from '@/lib/hooks/useContractDependencies'
import { DEMO_CONFIG } from './config'

export default function Demo() {
  const { isValid } = useContractDependencies(DEMO_CONFIG.components)
  // Must keep config in sync with actual usage
}
```

### After (Automatic Detection)
```typescript
// ✅ No config needed - automatic detection
export default function Demo() {
  return (
    <>
      {/* Just use components - dependencies detected automatically */}
      <ContractDependencyInfo />
      <LeaderBoard scoreBoardAddress={address} />
      <MatchBoard gameMatchAddress={address} />
    </>
  )
}
```

## Benefits

1. **Zero Configuration**: No config files to maintain
2. **Always Accurate**: Dependencies match actual usage
3. **Dynamic**: Adapts to conditional rendering
4. **Type-Safe**: Full TypeScript support
5. **Developer-Friendly**: Less boilerplate
6. **Automatic**: Components self-register

## Examples

### Example 1: Simple Demo

```typescript
import { LeaderBoard } from '@/sdk/src'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'

export default function LeaderboardDemo() {
  const address = process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS as `0x${string}`
  
  return (
    <div>
      {/* Shows: Active Components: LeaderBoard | Required: Scoreboard */}
      <ContractDependencyInfo />
      
      <LeaderBoard scoreBoardAddress={address} limit={10} />
    </div>
  )
}
```

### Example 2: Conditional Components

```typescript
import { LeaderBoard, MatchBoard, useOharaAi } from '@/sdk/src'

export default function ConditionalDemo() {
  const [mode, setMode] = useState<'game' | 'leaderboard'>('game')
  const { activeComponents } = useOharaAi()
  
  return (
    <div>
      <p>Currently tracking: {Array.from(activeComponents).join(', ')}</p>
      
      {mode === 'game' ? (
        // Only GameMatch contract required
        <MatchBoard gameMatchAddress={address} />
      ) : (
        // Only Scoreboard contract required
        <LeaderBoard scoreBoardAddress={address} />
      )}
    </div>
  )
}
```

### Example 3: Validation Guard

```typescript
import { useOharaAi } from '@/sdk/src'

export default function ValidatedDemo() {
  const { validation } = useOharaAi()
  
  if (!validation.valid) {
    return (
      <div>
        <h2>Missing Contracts</h2>
        <ul>
          {validation.missing.map(dep => (
            <li key={dep.contract}>
              {dep.contract}: Set {dep.envVar}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  return <YourDemo />
}
```

### Example 4: Debug Info

```typescript
import { useOharaAi } from '@/sdk/src'

export default function DebugDemo() {
  const { activeComponents, dependencies, validation } = useOharaAi()
  
  return (
    <div>
      <h3>Debug Info</h3>
      <pre>
        Active: {Array.from(activeComponents).join(', ')}
        Dependencies: {dependencies.map(d => d.contract).join(', ')}
        Valid: {validation.valid ? 'Yes' : 'No'}
      </pre>
      
      {/* Your demo */}
    </div>
  )
}
```

## Migration from Explicit Config

### Step 1: Add Provider (Already Done)
The `OharaAiProvider` is already added to your app's root `Providers` component.

### Step 2: Remove Config Files (Optional)
You can delete `config.ts` files from demo apps - they're no longer needed.

### Step 3: Update Components
Replace `useContractDependencies(config.components)` with `useOharaAi()`:

```typescript
// Before
import { useContractDependencies } from '@/lib/hooks/useContractDependencies'
import { DEMO_CONFIG } from './config'

const { validation } = useContractDependencies(DEMO_CONFIG.components)

// After
import { useOharaAi } from '@/sdk/src'

const { validation } = useOharaAi()
```

### Step 4: Update ContractDependencyInfo
No props needed anymore:

```typescript
// Before
<ContractDependencyInfo components={DEMO_CONFIG.components} />

// After
<ContractDependencyInfo />
```

## Adding New Components

When creating a new SDK component, just add the registration hook:

```typescript
export function YourComponent() {
  // Auto-register this component
  useComponentRegistration('YourComponent')
  
  // Your component logic
}

// Don't forget to add metadata
YourComponent.metadata = YOUR_COMPONENT_METADATA
```

That's it! The provider will automatically track it.

## Troubleshooting

### "useOharaAi must be used within OharaAiProvider"

**Solution**: Ensure `OharaAiProvider` wraps your app at a high level (e.g., in `Providers.tsx`).

### Components Not Being Tracked

**Solution**: Verify the component calls `useComponentRegistration()` with the correct name.

### Dependencies Show as Empty

**Solution**: Make sure SDK components are actually rendered (not just imported).

## Best Practices

1. **Place provider high in tree**: Wrap your entire app, not individual pages
2. **Use ContractDependencyInfo in dev**: Helpful for debugging
3. **Check validation**: Use `validation.valid` before rendering components
4. **Conditional rendering**: Let the provider track what's actually used
5. **Don't overthink it**: Just use components normally!

## Performance

- **Minimal overhead**: Simple Set operations for tracking
- **No re-renders**: Provider uses callbacks to update tracking
- **Efficient validation**: Only recalculates when active components change
- **Production-ready**: No performance concerns

## Summary

The `OharaAiProvider` eliminates manual configuration by automatically detecting which SDK components are in use and determining their contract dependencies. Just wrap your app, use components, and let the provider handle the rest.

**Key takeaway**: You no longer need to explicitly state contract dependencies in config files. The system figures it out automatically based on which components are actually rendered.
