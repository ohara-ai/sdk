# On-Chain Features

A comprehensive repository for modular on-chain gaming features with Solidity smart contracts, a user-ready SDK, and interactive demo applications.

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
├── sdk/                # UI component SDK for developers
│   ├── src/            # SDK source code
│   │   ├── components/ # React UI components
│   │   ├── hooks/      # Contract interaction hooks
│   │   ├── abis/       # Contract ABIs
│   │   └── utils/      # Utility functions
│   ├── demos/          # Example applications
│   └── docs/           # SDK documentation
├── app/                # Next.js demo application
├── components/         # React components
└── lib/                # Utilities and helpers
```

## Features

For detailed information about implemented and proposed features, see the [`proposals/`](./proposals/) directory. Each feature has its own design document with specifications, use cases, and implementation details.

## SDK

The **@ohara-ai/game-sdk** provides production-ready UI components and hooks for building on-chain gaming applications. The SDK offers a user-centric abstraction over the smart contracts, making it easy to integrate gaming features into your app.

### Quick Start

```bash
cd sdk
npm install
npm run build
```

### Components

- **LeaderBoard**: Display high scores from ScoreBoard contracts
- **WageringBox**: Create and join wagered game matches

### Example Usage

```tsx
import { LeaderBoard, WageringBox } from '@ohara-ai/game-sdk'

function App() {
  return (
    <>
      <WageringBox 
        gameMatchAddress="0x..."
        onMatchCreated={(id) => console.log('Match created:', id)}
      />
      <LeaderBoard 
        scoreBoardAddress="0x..."
        limit={10}
        sortBy="wins"
      />
    </>
  )
}
```

### Demo Applications

The SDK includes fully-functional demo apps:

- **Basic Leaderboard** (`sdk/demos/basic-leaderboard/`) - Simple leaderboard showcase
- **Wagering Game** (`sdk/demos/wagering-game/`) - Complete wagering game with both components

See [`sdk/README.md`](./sdk/README.md) for detailed documentation.

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

### Demo Application

#### Quick Start with Anvil (Local Development)

1. **Start local Anvil node**:
   ```bash
   anvil
   ```

2. **Deploy contracts**:
   ```bash
   # Deploy the GameMatchFactory
   forge script contracts/script/DeployGameMatch.s.sol:DeployGameMatch \
     --rpc-url http://localhost:8545 \
     --broadcast
   ```

3. **Configure environment**:
   ```bash
   # Copy the example env file
   cp .env.example .env.local
   
   # Edit .env.local and set the factory address from the deployment output
   # Example:
   # NEXT_PUBLIC_GAME_MATCH_FACTORY=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

4. **Run the app**:
   ```bash
   npm run dev
   ```

5. **Deploy GameMatch instance**:
   - Open http://localhost:3000
   - Click the "Deploy" button on the GameMatch feature card
   - The contract will be deployed automatically using the owner's private key (no wallet signature needed)
   - Once deployed, the contract address will be saved and the feature becomes accessible

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
