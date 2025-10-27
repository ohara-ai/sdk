# On-Chain Features

A comprehensive repository for modular on-chain gaming features with Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building gaming applications.

## SDK

The **OharaAI SDK** provides functional primitives for building on-chain gaming applications without dealing with blockchain complexity directly. The SDK exposes three main interfaces:

- **Match** - Create, join, and manage wagered game matches
- **Scores** - Query player statistics and leaderboards
- **App** - High-level interface combining Match + Scores operations

### Quick Start

```bash
# Install SDK dependencies
npm run sdk:install

# Build the SDK
npm run sdk:build

# Or run in watch mode for development
npm run sdk:dev
```

### Example Usage

```tsx
import { useOharaAi } from '@ohara-ai/game-sdk'
import { parseEther } from 'viem'

function GameComponent() {
  const { app } = useOharaAi()
  
  const createMatch = async () => {
    // Create a 2-player match with 0.1 ETH stake
    const hash = await app.match?.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
  }
  
  const getLeaderboard = async () => {
    // Get top 10 players by wins
    const result = await app.scores?.getTopPlayersByWins(10)
    return result
  }
  
  return (
    <div>
      <button onClick={createMatch}>Create Match</button>
      <button onClick={getLeaderboard}>View Leaderboard</button>
    </div>
  )
}
```

### Key Features

✅ **Functional Primitives** - Simple async functions instead of raw contract calls  
✅ **Type-Safe** - Full TypeScript support  
✅ **Automatic Dependency Resolution** - Provider handles contract coordination  
✅ **No UI Lock-in** - Build your own interface on top of primitives  
✅ **Fee Enforcement** - SDK coordinates on-chain fee requirements  

See [`SDK_QUICKSTART.md`](./SDK_QUICKSTART.md) for a quick start guide and [`sdk/README.md`](./sdk/README.md) for detailed documentation.

## Development

### Prerequisites
- Node.js 18+
- Foundry (for Solidity development)

### Installation

```bash
# Install Node dependencies
npm install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Smart Contracts

```bash
# Build contracts
npm run forge:build

# Run tests
npm run forge:test

# Run tests with verbose output
npm run forge:test:verbose

# Generate coverage report
npm run forge:coverage
```

### Contract Testing Application

The application includes an internal contract testing interface for validating on-chain features:
- Deploy and interact with GameMatch contracts
- Deploy and query GameScore contracts
- Test end-to-end workflows

#### Quick Start with Anvil (Local Development)

1. **Start local Anvil node**:
   ```bash
   anvil
   ```
2. **Configure environment**:
   ```bash
   # Copy the example env file
   cp .env.example .env
   ```

3. **Deploy factories and fund the controller**:
   ```bash
   npm run deploy-factories

   npm run fund-controller
   ```   

4. **Run the app**:
   ```bash
   npm run dev
   ```

5. **Explore the contract testing interface**:
   - Open http://localhost:3000/
   - Redeploy GameMatch and GameScore contracts
   - Test contract interactions directly

#### Deployment Flow

The app supports **dynamic contract deployment** with graceful handling of chain resets:

- **localStorage fallback**: Dynamically deployed contracts are saved per-chain in localStorage
- **Automatic validation**: On app load, validates that saved addresses still exist on-chain
- **Graceful reset handling**: Automatically clears invalid addresses when local chain resets

See [DEPLOYMENT_FLOW.md](./DEPLOYMENT_FLOW.md) for detailed documentation.

#### Other Commands

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Troubleshooting

### "Out of gas" error when deploying contracts

**Error**: `Out of gas: gas required exceeds allowance: 0`

**Cause**: The SDK's controller account doesn't have ETH on your local blockchain.

**Solution**: Fund the controller account:
```bash
npm run fund-controller
```

Or manually:
```bash
# Get controller address from ohara-ai-data/keys.json
cast send <CONTROLLER_ADDRESS> --value 10ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545
```

**Note**: You'll need to fund the controller again if you restart Anvil, as the local blockchain state is reset.

## License

MIT
