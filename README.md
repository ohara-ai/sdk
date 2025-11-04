# On-Chain Features

A comprehensive SDK and smart contract library for modular on-chain gaming features. This repository provides Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building gaming applications.

## Repository Structure

```
on-chain-features/
├── contracts/          # Solidity smart contracts
├── sdk/                # TypeScript SDK for on-chain features
├── scripts/            # Build and ABI update scripts
├── e2e-test/           # End-to-end testing application (Next.js)
└── README.md
```

## SDK

The **OharaAI SDK** provides functional primitives for building on-chain gaming applications without dealing with blockchain complexity directly. The SDK uses a hierarchical context structure:

- **`game.match`** - Create, join, withdraw from matches, and query match data
- **`game.scores`** - Query player statistics and leaderboards
- **`app.controller`** - Controller address for server-side operations
- **`internal.factories`** - Access to factory contract addresses

### Example Usage

```tsx
import { useOharaAi } from '@/sdk/src'
import { parseEther } from 'viem'

function GameComponent() {
  const { game } = useOharaAi()
  
  const createMatch = async () => {
    if (!game.match.operations) {
      throw new Error('Match operations not available')
    }
    
    // Create a 2-player match with 0.1 ETH stake
    const hash = await game.match.operations.create({
      token: '0x0000000000000000000000000000000000000000',
      stakeAmount: parseEther('0.1'),
      maxPlayers: 2
    })
    
    return hash
  }
  
  const getLeaderboard = async () => {
    if (!game.scores.operations) {
      throw new Error('Score operations not available')
    }
    
    // Get top 10 players by wins
    const result = await game.scores.operations.getTopPlayersByWins(10)
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
✅ **Type-Safe** - Full TypeScript support with hierarchical context  
✅ **Automatic Address Management** - Fetches contract addresses from backend  
✅ **No UI Lock-in** - Build your own interface on top of primitives  
✅ **Server-Side Operations** - Separate entry point for controller operations  

See [`sdk/README.md`](./sdk/README.md) for detailed documentation.

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Foundry (for Solidity development)

### Installation

```bash
# Install root dependencies (minimal)
npm install

# Install SDK dependencies
npm run sdk:install

# Install E2E test app dependencies
npm run e2e:install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Smart Contracts

Build and test Solidity contracts:

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

### SDK Development

Work with the TypeScript SDK:

```bash
# Build the SDK
npm run sdk:build

# Watch mode for development
npm run sdk:dev

# Run SDK tests
npm run sdk:test
```

### Update ABIs

After making changes to contracts, update the SDK's ABIs:

```bash
# Build contracts and update ABIs in one command
npm run update-abi
```

## E2E Testing Application

The `e2e-test/` directory contains a Next.js application for end-to-end testing and demonstration of the SDK features:

- Deploy and interact with GameMatch contracts
- Deploy and query GameScore contracts
- Test complete workflows with a web UI
- Validate SDK functionality in a real environment

### Quick Start with Anvil (Local Development)

1. **Start local Anvil node**:
   ```bash
   anvil
   ```

2. **Configure environment**:
   ```bash
   # Copy the example env file (if not already done)
   cp .env.anvil .env
   cp e2e-test/.env.example e2e-test/.env
   ```

3. **Setup dependencies - deploy factories and fund the controller**:
   ```bash
   npm run e2e:setup
   ```

4. **Run the E2E test app**:
   ```bash
   npm run e2e:dev
   npm run e2e:fund-controller
   ```

5. **Explore the testing interface**:
   - Open http://localhost:3000/
   - Connect your wallet
   - Deploy and test contracts
   - Test end-to-end workflows

### E2E Test App Features

The test application demonstrates:

- **Dynamic contract deployment** with graceful chain reset handling
- **localStorage persistence** for contract addresses per-chain
- **Automatic validation** of saved addresses on app load
- **Complete SDK integration** showcasing all functional primitives

See [`e2e-test/README.md`](./e2e-test/README.md) for detailed documentation.

### Other E2E Commands

```bash
# Build E2E app for production
npm run e2e:build

# Run E2E tests
npm run e2e:test
```

## License

MIT
