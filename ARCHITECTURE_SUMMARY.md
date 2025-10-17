# Ohara AI SDK - Complete Architecture Summary

## Overview

The Ohara AI Gaming SDK provides a **fully automatic, zero-configuration** experience for building on-chain gaming applications. From contract deployment to runtime address resolution, everything happens automatically.

## Core Principles

1. **Build-Time Provisioning**: Contracts deployed automatically during build
2. **Automatic Detection**: System scans code to determine needs
3. **Provider-Managed Resources**: Central orchestration of contract addresses
4. **Type-Safe Components**: Full TypeScript support throughout
5. **Backend-Ready**: Controller keys for admin operations

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD TIME                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  npm run build                                                  │
│     ↓                                                           │
│  npm run provision (prebuild)                                   │
│     ↓                                                           │
│  provision-contracts.ts                                         │
│     ├─→ Scan app/ for SDK components                           │
│     ├─→ Detect required contracts                              │
│     ├─→ Generate controller private key                        │
│     ├─→ Deploy via factories                                   │
│     └─→ Write .onchain-cfg.json                                │
│                                                                 │
│  next build                                                     │
│     └─→ Bundle application                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Server Start                                                   │
│     ↓                                                           │
│  instrumentation.ts (Next.js hook)                              │
│     ↓                                                           │
│  injectConfigIntoEnv()                                          │
│     └─→ Load .onchain-cfg.json                                 │
│         └─→ Inject into process.env                            │
│                                                                 │
│  App Renders                                                    │
│     ↓                                                           │
│  <OharaAiProvider chainId={chainId}>                           │
│     ├─→ Reads from process.env (injected)                      │
│     ├─→ Reads from localStorage (dev overrides)                │
│     ├─→ Listens for deployment events                          │
│     └─→ Provides addresses to components                       │
│                                                                 │
│  Components Render                                              │
│     ↓                                                           │
│  <LeaderBoard /> <MatchBoard />                               │
│     ├─→ useComponentRegistration() (auto)                      │
│     ├─→ useOharaAi() → getContractAddress()                    │
│     └─→ Address automatically resolved                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Build-Time Provisioning

**File**: `scripts/provision-contracts.ts`

**Purpose**: Automatically detect needs and deploy contracts during build.

**Features**:
- Code scanning to detect component usage
- Automatic controller key generation
- Factory-based contract deployment
- Configuration file generation

**Usage**:
```bash
npm run build  # Automatically runs provisioning
```

### 2. Configuration Management

**File**: `.onchain-cfg.json`

**Purpose**: Store deployed contract addresses and controller keys.

**Structure**:
```json
{
  "controllerPrivateKey": "0x...",  // ⚠️ Server-side only
  "controllerAddress": "0x...",
  "chainId": 31337,
  "contracts": {
    "scoreboard": "0x...",
    "gameMatch": "0x..."
  }
}
```

**Security**: Gitignored, private key never exposed to client.

### 3. Runtime Injection

**File**: `instrumentation.ts`

**Purpose**: Load config and inject into environment on server start.

**Features**:
- Next.js instrumentation hook
- Server-side config loading
- Environment variable injection

**Result**:
```typescript
process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS = config.contracts.scoreboard
process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE = config.contracts.gameMatch
```

### 4. OharaAiProvider

**File**: `sdk/src/context/OnchainContext.tsx`

**Purpose**: Central orchestrator for contract addresses and component tracking.

**Features**:
- Automatic component registration
- Address resolution (config > localStorage > env)
- Reactive to deployments
- Chain-aware address loading
- Dependency validation

**Usage**:
```typescript
<OharaAiProvider chainId={chainId}>
  <YourApp />
</OharaAiProvider>
```

### 5. SDK Components

**Files**: 
- `sdk/src/components/LeaderBoard.tsx`
- `sdk/src/components/MatchBoard.tsx`

**Features**:
- Auto-registration with provider
- Optional address props (auto-resolved if omitted)
- Type-safe interfaces
- Error handling for missing addresses

**Usage**:
```typescript
// No props needed - addresses auto-resolved
<LeaderBoard limit={10} sortBy="wins" />
<MatchBoard onMatchCreated={handleCreate} />
```

## Address Resolution Priority

The system resolves contract addresses in this order:

```
1. Component props (highest)         // Manual override
   ↓
2. .onchain-cfg.json (via env)       // Build-time provisioned
   ↓
3. localStorage                       // Dev overrides
   ↓
4. Environment variables              // Static config
   ↓
5. Not configured (show error)        // Nothing found
```

## Data Flow

### Build Flow

```
Developer writes code
    → Uses <LeaderBoard /> component
        → Runs npm run build
            → provision-contracts.ts scans code
                → Detects LeaderBoard usage
                    → Knows Scoreboard contract needed
                        → Checks .onchain-cfg.json
                            → Not found → Generates controller key
                                → Deploys Scoreboard via factory
                                    → Writes .onchain-cfg.json
                                        → Build completes
```

### Runtime Flow

```
Server starts
    → instrumentation.ts runs
        → Loads .onchain-cfg.json
            → Injects into process.env
                → App renders
                    → OharaAiProvider reads env
                        → LeaderBoard mounts
                            → useComponentRegistration()
                                → useOharaAi()
                                    → getContractAddress('Scoreboard')
                                        → Returns address from context
                                            → Component renders with address
```

## Component Dependency Graph

```
LeaderBoard
    └─→ Requires: Scoreboard contract
        └─→ Env: NEXT_PUBLIC_SCOREBOARD_ADDRESS

MatchBoard
    ├─→ Requires: GameMatch contract
    │   └─→ Env: NEXT_PUBLIC_GAME_MATCH_INSTANCE
    └─→ Requires: Scoreboard contract (via GameMatch)
        └─→ Env: NEXT_PUBLIC_SCOREBOARD_ADDRESS
```

## File Tree

```
ohara-ai/on-chain-features/
├── .onchain-cfg.json                      # ⚠️ Gitignored (private key)
├── .gitignore                              # Excludes config file
├── next.config.js                          # Enables instrumentation
├── instrumentation.ts                      # Runtime injection
├── package.json
│   └── scripts:
│       └── build: "npm run provision && next build"
│
├── lib/
│   └── onchain-config.ts                   # Config loader
│
├── scripts/
│   └── provision-contracts.ts              # Build-time provisioning
│
├── sdk/src/
│   ├── context/
│   │   └── OnchainContext.tsx              # OharaAiProvider
│   ├── components/
│   │   ├── LeaderBoard.tsx                 # Auto-registering component
│   │   └── MatchBoard.tsx                 # Auto-registering component
│   ├── metadata/
│   │   └── componentDependencies.ts        # Component metadata
│   └── index.ts                            # SDK exports
│
├── components/
│   ├── Providers.tsx                       # App-level providers
│   └── ContractDependencyInfo.tsx          # Dependency UI
│
└── app/
    └── demos/
        ├── leaderboard/page.tsx            # Demo using LeaderBoard
        └── tic-tac-toe/page.tsx            # Demo using both components
```

## Environment Variables

### Required (Pre-Provisioning)

```bash
# For contract deployment
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337

# Factory addresses
NEXT_PUBLIC_SCOREBOARD_FACTORY=0x...
NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...
```

### Generated (Post-Provisioning)

```bash
# Auto-injected from .onchain-cfg.json
NEXT_PUBLIC_SCOREBOARD_ADDRESS=0x...
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x...
```

## Workflows

### Development

```bash
# 1. Start local blockchain
anvil

# 2. Deploy factories (one-time setup)
forge script scripts/DeployFactories.s.sol --rpc-url $RPC_URL --broadcast

# 3. Set factory env vars
export NEXT_PUBLIC_SCOREBOARD_FACTORY=0x...
export NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...

# 4. Build (provisions contracts)
npm run build

# 5. Run app
npm start

# 6. Components work automatically! ✨
```

### Production

```bash
# 1. Set production env vars
export NEXT_PUBLIC_RPC_URL=https://mainnet-rpc.com
export NEXT_PUBLIC_CHAIN_ID=1
export NEXT_PUBLIC_SCOREBOARD_FACTORY=0x...
export NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...

# 2. Build (provisions contracts)
npm run build

# 3. Secure .onchain-cfg.json
# Store in AWS Secrets Manager, HashiCorp Vault, etc.

# 4. Deploy and run
npm start
```

## Security Considerations

### Private Key Management

⚠️ **Critical**: `.onchain-cfg.json` contains controller private key

**Protections**:
- ✅ Gitignored by default
- ✅ Never sent to client
- ✅ Server-side guards prevent client access
- ✅ Separate loaders for server vs client

**Production Storage**:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Environment-specific secrets

### Client-Side Safety

```typescript
// ❌ NEVER do this - private key exposure risk
const config = require('./.onchain-cfg.json')
console.log(config.controllerPrivateKey)

// ✅ Use safe loaders
import { loadOnchainConfigClient } from '@/lib/onchain-config'
const config = loadOnchainConfigClient()  // No private key
```

## Benefits

### For End Users (App Developers)

✅ **Zero Configuration**: Just install SDK and build  
✅ **Automatic Deployment**: Contracts deployed transparently  
✅ **No Manual Steps**: No contract addresses to copy/paste  
✅ **Backend Ready**: Controller key for admin operations  
✅ **Type-Safe**: Full TypeScript support  

### For SDK Developers

✅ **Extensible**: Easy to add new components  
✅ **Maintainable**: Clear separation of concerns  
✅ **Testable**: Mock providers for testing  
✅ **Observable**: ContractDependencyInfo for debugging  

## Extension Points

### Adding New Components

```typescript
// 1. Define metadata
export const YOUR_COMPONENT_METADATA = {
  name: 'YourComponent',
  dependencies: [{
    contract: ContractType.YOUR_CONTRACT,
    required: true,
    envVar: 'NEXT_PUBLIC_YOUR_CONTRACT_ADDRESS',
  }],
}

// 2. Implement component
export function YourComponent() {
  useComponentRegistration('YourComponent')
  const { getContractAddress } = useOharaAi()
  const address = getContractAddress(ContractType.YOUR_CONTRACT)
  // ...
}

// 3. Update provision script
if (requiredContracts.has('yourContract')) {
  const address = await deployYourContract(ctx)
  config.contracts.yourContract = address
}
```

### Custom Deployment Logic

Modify `scripts/provision-contracts.ts`:
- Add custom contract detection
- Implement custom deployment functions
- Add validation logic

### Backend Integration

```typescript
// API route example
import { loadOnchainConfigServer } from '@/lib/onchain-config'
import { privateKeyToAccount } from 'viem/accounts'

export async function POST(req: Request) {
  const config = loadOnchainConfigServer()
  const account = privateKeyToAccount(config!.controllerPrivateKey)
  
  // Use controller to execute admin operations
  await walletClient.writeContract({
    address: config!.contracts.scoreboard,
    abi: SCOREBOARD_ABI,
    functionName: 'adminFunction',
    account,
  })
}
```

## Documentation

- **`BUILD_TIME_PROVISIONING.md`**: Detailed provisioning guide
- **`PROVIDER_MANAGED_ADDRESSES.md`**: Provider architecture
- **`REACTIVE_ADDRESS_RESOLUTION.md`**: Runtime address resolution
- **`AUTOMATIC_DEPENDENCY_DETECTION.md`**: Component tracking
- **`sdk/OHARA_AI_PROVIDER.md`**: Provider API reference

## Summary

The Ohara AI SDK implements a **"build and go"** philosophy:

1. **Install**: `npm install @ohara-ai/game-sdk`
2. **Code**: Use SDK components in your app
3. **Build**: `npm run build` (auto-provisions contracts)
4. **Run**: `npm start` (addresses injected automatically)

**Result**: Fully functional on-chain gaming app with zero manual configuration.

The system handles:
- ✅ Contract deployment
- ✅ Address management
- ✅ Backend keys
- ✅ Component orchestration
- ✅ Error handling
- ✅ Multi-chain support

**You focus on**: Building your game logic and UI.
