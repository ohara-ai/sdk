# @ohara-ai/game-sdk

Production-ready UI components and hooks for building on-chain gaming applications.

## Installation

```bash
npm install @ohara-ai/game-sdk viem wagmi
```

## Table of Contents

- [OharaAiProvider](#oharaAiprovider)
- [Components](#components)
- [Setup](#setup)
- [Development](#development)

## OharaAiProvider

The `OharaAiProvider` is the core context provider that enables automatic contract dependency detection and management for all SDK components.

### Overview

Wrap your app with `OharaAiProvider` to enable:
- ✅ Automatic tracking of mounted SDK components
- ✅ Dynamic contract dependency resolution
- ✅ Real-time validation of contract configurations
- ✅ Reactive address resolution from environment and localStorage
- ✅ Type-safe contract address management

### Basic Usage

```tsx
import { OharaAiProvider } from '@ohara-ai/game-sdk'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider } from '@tanstack/react-query'

function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OharaAiProvider>
          {children}
        </OharaAiProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Your app content |
| `env` | `Record<string, string \| undefined>` | `process.env` | Environment variables for contract addresses |
| `chainId` | `number` | Auto-detected | Chain ID for localStorage keys |

### useOharaAi Hook

Access provider data anywhere in your app using the `useOharaAi` hook.

#### Returned Data

```tsx
const {
  activeComponents,      // Set<ComponentName>
  registerComponent,     // (name: ComponentName) => void
  unregisterComponent,   // (name: ComponentName) => void
  dependencies,          // ContractDependency[]
  validation,            // { valid, missing, configured }
  env,                   // Record<string, string | undefined>
  getContractAddress,    // (type: ContractType) => Address | undefined
  addresses,             // { SCOREBOARD?: Address, GAME_MATCH?: Address }
} = useOharaAi()
```

#### Data Types

**`activeComponents: Set<ComponentName>`**
- Currently mounted SDK components in your React tree
- Updates automatically when components mount/unmount
- Possible values: `'LeaderBoard'`, `'WageringBox'`

**`dependencies: ContractDependency[]`**
- Array of contract dependencies based on active components
- Each dependency includes:
  - `contract`: `ContractType` - Type of contract (e.g., `'Scoreboard'`, `'GameMatch'`)
  - `required`: `boolean` - Whether the contract is required
  - `envVar`: `string` - Environment variable name for the address
  - `description`: `string` - Why the contract is needed

**`validation: ValidationResult`**
- `valid`: `boolean` - Whether all required contracts are configured
- `missing`: `ContractDependency[]` - Dependencies that are not configured
- `configured`: `ContractDependency[]` - Dependencies that are properly configured

**`addresses: ContractAddresses`**
- Resolved contract addresses from environment variables and localStorage
- Priority: localStorage > environment variables (allows runtime overrides)
- Type: `{ SCOREBOARD?: Address, GAME_MATCH?: Address }`

**`getContractAddress(type: ContractType): Address | undefined`**
- Helper function to get contract address by type
- Returns the address or `undefined` if not configured

### Example: Displaying Provider Data

```tsx
import { useOharaAi, ContractType } from '@ohara-ai/game-sdk'

function AppStatus() {
  const { 
    activeComponents, 
    dependencies, 
    validation,
    addresses,
    getContractAddress 
  } = useOharaAi()

  return (
    <div>
      <h3>Active Components</h3>
      <p>{Array.from(activeComponents).join(', ') || 'None'}</p>

      <h3>Contract Dependencies</h3>
      <ul>
        {dependencies.map(dep => (
          <li key={dep.contract}>
            {dep.contract} - {dep.required ? 'Required' : 'Optional'}
            <br />
            <small>{dep.description}</small>
          </li>
        ))}
      </ul>

      <h3>Validation Status</h3>
      <p>Valid: {validation.valid ? '✅' : '❌'}</p>
      {validation.missing.length > 0 && (
        <div>
          <strong>Missing:</strong>
          <ul>
            {validation.missing.map(m => (
              <li key={m.contract}>{m.contract} - Set {m.envVar}</li>
            ))}
          </ul>
        </div>
      )}

      <h3>Configured Addresses</h3>
      <ul>
        <li>Scoreboard: {addresses.Scoreboard || 'Not configured'}</li>
        <li>GameMatch: {addresses.GameMatch || 'Not configured'}</li>
      </ul>
    </div>
  )
}
```

### Example: Validation Guard

```tsx
import { useOharaAi } from '@ohara-ai/game-sdk'

function GameDemo() {
  const { validation } = useOharaAi()

  if (!validation.valid) {
    return (
      <div className="error">
        <h2>Configuration Required</h2>
        <p>Please configure the following contracts:</p>
        <ul>
          {validation.missing.map(dep => (
            <li key={dep.contract}>
              {dep.contract}: Set environment variable {dep.envVar}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      {/* Your game demo */}
    </div>
  )
}
```

### Environment Variables

The provider checks for contract addresses in the following environment variables:

**Scoreboard Contract:**
- `NEXT_PUBLIC_SCOREBOARD_ADDRESS`
- `NEXT_PUBLIC_SCOREBOARD_INSTANCE`

**GameMatch Contract:**
- `NEXT_PUBLIC_GAME_MATCH_INSTANCE`
- `NEXT_PUBLIC_GAME_MATCH_ADDRESS`

**Note:** Addresses stored in localStorage take precedence over environment variables, enabling dynamic runtime configuration.

### Advanced Features

**Automatic Component Registration:**
SDK components automatically register themselves when mounted:

```tsx
import { LeaderBoard } from '@ohara-ai/game-sdk'

// LeaderBoard auto-registers on mount, unregisters on unmount
<LeaderBoard scoreBoardAddress="0x..." />
```

**Conditional Rendering Support:**
Dependencies are only tracked when components are actually rendered:

```tsx
const [showLeaderboard, setShowLeaderboard] = useState(false)

{showLeaderboard && <LeaderBoard scoreBoardAddress="0x..." />}
// Scoreboard contract only required when showLeaderboard is true
```

**localStorage Integration:**
Contract addresses can be set dynamically at runtime:

```tsx
// Store address in localStorage
localStorage.setItem(`deployed_scoreboard_${chainId}`, '0x123...')

// Dispatch event to notify provider
window.dispatchEvent(new Event('contractDeployed'))

// Provider automatically picks up the new address
```

For more details, see [OHARA_AI_PROVIDER.md](./OHARA_AI_PROVIDER.md).

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
