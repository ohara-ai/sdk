# On-Chain Features

A comprehensive repository for modular on-chain gaming features with Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building gaming applications.

## Adding New Features

We use a lightweight proposal process to ensure features are well-designed before implementation:

1. **Create Proposal**: Use the template in `proposals/TEMPLATE.md` to document:
   - Problem statement and user needs
   - Interface specification
   - Integration requirements and dependencies
   - Security considerations
   
2. **Review**: Share proposal for feedback and iterate on design

3. **Implement**: Once approved:
   - Create directory under `contracts/src/features/[feature-name]/`
   - Implement the feature contract following the interface
   - Add comprehensive tests in `contracts/test/`
   - Create demo UI in `app/features/[feature-name]/`
   - Update documentation

See [`proposals/README.md`](./proposals/README.md) for detailed guidance on the proposal process.

## Structure

```
├── proposals/          # Feature proposals and design documents
├── contracts/          # Solidity smart contracts
│   ├── src/
│   │   ├── base/       # Base contracts and utilities
│   │   ├── factories/  # Contract factories for efficient deployment
│   │   ├── features/   # Individual on-chain features
│   │   └── interfaces/ # Contract interfaces
│   ├── test/           # Solidity tests
│   └── script/         # Deployment scripts
├── sdk/                # OharaAI SDK - Functional primitives for on-chain gaming
│   ├── src/
│   │   ├── core/       # Core primitives (Match, Scores, App)
│   │   ├── context/    # OharaAiProvider for dependency coordination
│   │   ├── abis/       # Contract ABIs
│   │   └── types/      # TypeScript types
│   ├── package.json    # SDK package configuration
│   └── README.md       # SDK documentation
├── app/                # Next.js application
│   └── contract-testing/    # Contract testing interface for validation
├── components/         # Shared React components
└── lib/                # Utilities and helpers
```

## Features

For detailed information about implemented and proposed features, see the [`proposals/`](./proposals/) directory. Each feature has its own design document with specifications, use cases, and implementation details.

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

2. **Deploy contracts**:
   ```bash
    # Deploy DEVWORLD token (for testing ERC20 features)
    forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
      --rpc-url http://localhost:8545 --broadcast

    # Deploy GameMatchFactory
    forge script contracts/script/DeployGameMatchFactory.s.sol:DeployGameMatchFactory \
      --rpc-url http://localhost:8545 --broadcast

    # Deploy GameScoreFactory
    forge script contracts/script/DeployGameScoreFactory.s.sol:DeployGameScoreFactory \
      --rpc-url http://localhost:8545 --broadcast
   ```

3. **Configure environment**:
   ```bash
   # Copy the example env file
   cp .env.example .env.local
   
   # Edit .env.local and set the addresses from deployment output
   # Example:
   # NEXT_PUBLIC_GAME_MATCH_FACTORY=0x5FbDB2315678afecb367f032d93F642f64180aa3
   # NEXT_PUBLIC_GAMESCORE_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   ```

4. **Run the app**:
   ```bash
   npm run dev
   ```

5. **Explore the contract testing interface**:
   - Open http://localhost:3000/contract-testing
   - Deploy GameMatch and GameScore contracts
   - Test contract interactions directly

#### Deployment Flow

The app supports **dynamic contract deployment** with graceful handling of chain resets:

- **ENV variable priority**: Set `NEXT_PUBLIC_GAME_MATCH_INSTANCE` for persistent deployments
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

## License

MIT
