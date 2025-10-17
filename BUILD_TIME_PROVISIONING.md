# Build-Time Contract Provisioning

## Overview

The Ohara AI SDK implements **automatic contract provisioning** during the build process. When you build your app, the system:

1. ✅ Scans your code to detect which SDK components are used
2. ✅ Determines which contracts are needed
3. ✅ Generates a controller private key for backend operations (if needed)
4. ✅ Deploys missing contracts via factories
5. ✅ Stores configuration in `.onchain-cfg.json`
6. ✅ Injects addresses into the app at runtime

**Result**: No manual contract deployment needed. Just build and run.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Build Process                           │
│                                                                 │
│  1. npm run build                                               │
│  2. → npm run provision (prebuild hook)                        │
│  3.   → tsx scripts/provision-contracts.ts                     │
│  4.     → Scan app/ for SDK component usage                    │
│  5.     → Detect required contracts                            │
│  6.     → Check .onchain-cfg.json                              │
│  7.     → Generate controller key (if needed)                  │
│  8.     → Deploy missing contracts via factories              │
│  9.     → Write .onchain-cfg.json                              │
│ 10. → next build                                               │
│ 11.   → instrumentation.ts injects config into env            │
│ 12.   → OharaAiProvider reads addresses                       │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
your-app/
├── .onchain-cfg.json              # ⚠️ DO NOT COMMIT (contains private key)
├── instrumentation.ts              # Next.js startup hook
├── lib/
│   └── onchain-config.ts           # Config loader utilities
├── scripts/
│   └── provision-contracts.ts      # Build-time provisioning script
├── package.json
│   └── scripts:
│       └── build: "npm run provision && next build"
└── .gitignore
    └── .onchain-cfg.json           # ⚠️ Must be gitignored!
```

## Configuration File

### `.onchain-cfg.json`

Generated during build, contains:

```json
{
  "controllerPrivateKey": "0x...",    // ⚠️ SENSITIVE - Backend use only
  "controllerAddress": "0x...",
  "chainId": 31337,
  "rpcUrl": "http://127.0.0.1:8545",
  "contracts": {
    "scoreboard": "0x...",            // Deployed ScoreBoard contract
    "gameMatch": "0x..."              // Deployed GameMatch contract
  },
  "factories": {
    "scoreboard": "0x...",            // Factory used for deployment
    "gameMatch": "0x..."
  },
  "lastUpdated": "2025-01-17T10:30:00.000Z"
}
```

### Security

⚠️ **CRITICAL**: `.onchain-cfg.json` contains a private key and **MUST NOT** be committed to git!

- ✅ Added to `.gitignore` automatically
- ✅ Private key only exposed server-side
- ✅ Client receives addresses only (no private key)

## How It Works

### 1. Automatic Detection

The provision script scans your `app/` directory for SDK component usage:

```typescript
// If your app uses:
import { LeaderBoard } from '@ohara-ai/game-sdk'

// The script detects:
// - LeaderBoard requires Scoreboard contract
// → Scoreboard will be deployed if missing
```

```typescript
// If your app uses:
import { MatchBoard } from '@ohara-ai/game-sdk'

// The script detects:
// - MatchBoard requires GameMatch contract
// - GameMatch requires Scoreboard contract
// → Both contracts will be deployed if missing
```

### 2. Controller Key Generation

On first build, a controller private key is generated:

```typescript
// Automatically generated
const controllerPrivateKey = '0x' + crypto.randomBytes(32).toString('hex')
const controllerAccount = privateKeyToAccount(controllerPrivateKey)

// Stored in .onchain-cfg.json for backend use
```

**Purpose**: The controller account acts on behalf of your app to:
- Deploy contracts
- Call admin functions
- Manage game state

**Funding**: On local development (Anvil), the controller is automatically funded from test accounts.

### 3. Contract Deployment

Contracts are deployed via factories (addresses from env vars):

```typescript
// Example: ScoreBoard deployment
const factory = process.env.NEXT_PUBLIC_SCOREBOARD_FACTORY
const hash = await walletClient.writeContract({
  address: factory,
  abi: SCOREBOARD_FACTORY_ABI,
  functionName: 'deployScoreboard',
  account: controllerAccount,
})

// Address is stored in .onchain-cfg.json
```

### 4. Runtime Injection

When the Next.js server starts:

```typescript
// instrumentation.ts (runs on server start)
import { injectConfigIntoEnv } from './lib/onchain-config'

export async function register() {
  injectConfigIntoEnv()  // Loads .onchain-cfg.json → process.env
}
```

```typescript
// Result: Standard env vars are populated
process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS = config.contracts.scoreboard
process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE = config.contracts.gameMatch
```

### 5. Provider Access

The `OharaAiProvider` automatically reads these injected env vars:

```typescript
// No configuration needed in your app
<OharaAiProvider>
  <YourApp />
</OharaAiProvider>

// Components automatically get addresses
<LeaderBoard />  // Uses injected Scoreboard address
<MatchBoard />  // Uses injected GameMatch address
```

## Environment Variables

### Required for Provisioning

```bash
# RPC endpoint for deployment
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545

# Chain ID
NEXT_PUBLIC_CHAIN_ID=31337

# Factory contract addresses
NEXT_PUBLIC_SCOREBOARD_FACTORY=0x...
NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...
```

### Generated (Auto-Injected)

```bash
# These are auto-populated from .onchain-cfg.json
NEXT_PUBLIC_SCOREBOARD_ADDRESS=0x...    # ← From config
NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x...   # ← From config
```

## Usage

### Development Workflow

```bash
# 1. Start local chain (Anvil)
anvil

# 2. (Optional) Check factories are deployed
# Factory addresses should be in .env

# 3. Build your app
npm run build
# → Provisions contracts automatically
# → Creates .onchain-cfg.json
# → Deploys missing contracts

# 4. Run your app
npm start
# → Reads .onchain-cfg.json
# → Injects addresses
# → Components work automatically

# 5. (Optional) Check configuration
npm run provision:check
```

### Production Workflow

```bash
# 1. Set production env vars
export NEXT_PUBLIC_RPC_URL=https://your-rpc.com
export NEXT_PUBLIC_CHAIN_ID=1
export NEXT_PUBLIC_SCOREBOARD_FACTORY=0x...
export NEXT_PUBLIC_GAME_MATCH_FACTORY=0x...

# 2. Build (provisions on first build)
npm run build
# → Creates .onchain-cfg.json with production contracts

# 3. Securely store .onchain-cfg.json
# ⚠️ This file contains the controller private key!
# Store in secure backend storage (e.g., AWS Secrets Manager)

# 4. Deploy and run
npm start
```

## Scripts

### `npm run provision`

Manually run provisioning (usually automatic):

```bash
npm run provision
```

Output:
```
🚀 Starting contract provisioning...
📡 RPC URL: http://127.0.0.1:8545
⛓️  Chain ID: 31337
📋 Controller: 0x...

🔍 Required contracts: scoreboard, gameMatch

💰 Controller balance: 10000000000000000000 wei
📝 Deploying ScoreBoard via factory 0x...
   Transaction: 0x...
✅ ScoreBoard deployed at 0x...

📝 Deploying GameMatch via factory 0x...
   Transaction: 0x...
✅ GameMatch deployed at 0x...

✅ Saved config to .onchain-cfg.json

✨ Contract provisioning complete!
```

### `npm run provision:check`

View current configuration:

```bash
npm run provision:check
```

Output:
```json
{
  "controllerAddress": "0x...",
  "chainId": 31337,
  "contracts": {
    "scoreboard": "0x...",
    "gameMatch": "0x..."
  },
  "lastUpdated": "2025-01-17T10:30:00.000Z"
}
```

## Backend Usage

### Access Controller for Admin Operations

```typescript
// Server-side only! (API route, backend script, etc.)
import { loadOnchainConfigServer } from '@/lib/onchain-config'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'

const config = loadOnchainConfigServer()  // Includes private key
if (!config) throw new Error('No config found')

const account = privateKeyToAccount(config.controllerPrivateKey as `0x${string}`)

const walletClient = createWalletClient({
  account,
  chain: ...,
  transport: http(config.rpcUrl)
})

// Now you can call contract functions as the controller
await walletClient.writeContract({
  address: config.contracts.scoreboard,
  abi: SCOREBOARD_ABI,
  functionName: 'adminFunction',
  args: [...]
})
```

### Client-Safe Config Access

```typescript
// Safe for client-side (no private key)
import { loadOnchainConfigClient } from '@/lib/onchain-config'

const config = loadOnchainConfigClient()
if (config) {
  console.log('Controller:', config.controllerAddress)
  console.log('Scoreboard:', config.contracts.scoreboard)
  // config.controllerPrivateKey is NOT available here
}
```

## Benefits

### For Developers

✅ **Zero Manual Setup**: Just code and build  
✅ **Automatic Detection**: No config files to maintain  
✅ **Self-Healing**: Missing contracts deployed automatically  
✅ **Backend Ready**: Controller key generated for admin ops  
✅ **Chain-Aware**: Works with any EVM chain  

### For SDK Users

✅ **Plug-and-Play**: Import components, build, done  
✅ **No Contract Knowledge**: Don't need to understand deployment  
✅ **Environment Agnostic**: Works in dev, staging, prod  
✅ **Type-Safe**: Full TypeScript support  

## Advanced Configuration

### Custom Deployment Logic

You can customize the provisioning script:

```typescript
// scripts/provision-contracts.ts

// Add custom contract detection
if (content.includes('MyCustomComponent')) {
  required.add('myCustomContract')
}

// Add custom deployment logic
async function deployMyContract(ctx) {
  // Your deployment logic
}
```

### Multi-Chain Support

The config file is chain-specific:

```bash
# Deploy to multiple chains
NEXT_PUBLIC_CHAIN_ID=1 npm run provision      # Mainnet
NEXT_PUBLIC_CHAIN_ID=137 npm run provision    # Polygon
NEXT_PUBLIC_CHAIN_ID=31337 npm run provision  # Local
```

Each chain gets its own `.onchain-cfg.json` (you may want separate files per chain).

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Provision contracts
  run: npm run provision
  env:
    NEXT_PUBLIC_RPC_URL: ${{ secrets.RPC_URL }}
    NEXT_PUBLIC_CHAIN_ID: ${{ secrets.CHAIN_ID }}
    NEXT_PUBLIC_SCOREBOARD_FACTORY: ${{ secrets.SCOREBOARD_FACTORY }}
    NEXT_PUBLIC_GAME_MATCH_FACTORY: ${{ secrets.GAME_MATCH_FACTORY }}

- name: Store config securely
  run: |
    # Upload .onchain-cfg.json to secure storage
    aws s3 cp .onchain-cfg.json s3://my-secrets/onchain-cfg.json --sse
```

## Troubleshooting

### "Factory address not provided"

**Problem**: Missing factory env var  
**Solution**: Set `NEXT_PUBLIC_SCOREBOARD_FACTORY` and `NEXT_PUBLIC_GAME_MATCH_FACTORY`

### "Controller has no balance"

**Problem**: Controller account has no gas  
**Solution**: 
- Local dev: Automatically funded from test accounts
- Production: Manually fund the controller address

### "Config is for chain X, but current chain is Y"

**Problem**: Chain mismatch  
**Solution**: Delete `.onchain-cfg.json` and rebuild, or use separate config files per chain

### Contracts already deployed but script re-deploys

**Problem**: `.onchain-cfg.json` was deleted  
**Solution**: The file is your source of truth. Keep it! If lost, script will re-deploy.

## Migration from Manual Deployment

### Old Way (Manual)

```typescript
// 1. Manually deploy contracts via contract testing page
// 2. Copy addresses
// 3. Set env vars
// 4. Hope you didn't miss anything
```

### New Way (Automatic)

```typescript
// 1. npm run build
// 2. Done! 🎉
```

### Migrating

If you have existing deployed contracts:

**Option 1: Keep using them**
```bash
# Set env vars to point to existing contracts
export NEXT_PUBLIC_SCOREBOARD_ADDRESS=0x...  # Your existing
export NEXT_PUBLIC_GAME_MATCH_INSTANCE=0x... # Your existing

# Build will skip deployment
npm run build
```

**Option 2: Fresh start**
```bash
# Delete any existing config
rm .onchain-cfg.json

# Build will provision new contracts
npm run build
```

## Files Reference

### Core Files

1. **`scripts/provision-contracts.ts`** - Build-time provisioning logic
2. **`lib/onchain-config.ts`** - Config loader utilities
3. **`instrumentation.ts`** - Next.js startup hook
4. **`.onchain-cfg.json`** - Generated configuration (⚠️ gitignored)

### Integration Points

1. **`package.json`** - Build script hook
2. **`.gitignore`** - Excludes config file
3. **`components/Providers.tsx`** - OharaAiProvider setup
4. **`sdk/src/context/OnchainContext.tsx`** - Address resolution

## Security Checklist

- ✅ `.onchain-cfg.json` in `.gitignore`
- ✅ Private key never exposed to client
- ✅ Server-side config loader guards against client access
- ✅ Controller key stored securely in production
- ✅ Separate configs per environment

## Summary

Build-time provisioning eliminates manual contract deployment:

1. **Build**: Detects needs, generates key, deploys contracts
2. **Runtime**: Injects addresses, providers read automatically
3. **Result**: SDK components work out of the box

**For SDK users**: Just `npm install`, `npm run build`, and go! The system handles everything else.
