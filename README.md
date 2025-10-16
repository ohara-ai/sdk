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
│   │   ├── components/ # React UI components (LeaderBoard, WageringBox)
│   │   ├── abis/       # Contract ABIs
│   │   └── utils/      # Utility functions
│   ├── package.json    # SDK package configuration
│   └── README.md       # SDK documentation
├── app/                # Next.js demo application
│   ├── demos/          # SDK component demos
│   │   ├── tic-tac-toe/     # Tic-tac-toe game demo
│   │   └── leaderboard/     # Leaderboard showcase
│   └── contract-testing/    # Internal contract testing interface
├── components/         # Shared React components
└── lib/                # Utilities and helpers
```

## Features

For detailed information about implemented and proposed features, see the [`proposals/`](./proposals/) directory. Each feature has its own design document with specifications, use cases, and implementation details.

## SDK

The **@ohara-ai/game-sdk** provides production-ready UI components and hooks for building on-chain gaming applications. The SDK offers a user-centric abstraction over the smart contracts, making it easy to integrate gaming features into your app.

### Quick Start

```bash
# Install SDK dependencies
npm run sdk:install

# Build the SDK
npm run sdk:build

# Or run in watch mode for development
npm run sdk:dev
```

### Components

- **LeaderBoard**: Display high scores and player rankings from ScoreBoard contracts with customizable sorting
- **WageringBox**: Create and join wagered game matches with built-in escrow management

### Example Usage

```tsx
import { LeaderBoard, WageringBox } from '@ohara-ai/game-sdk'

function App() {
  return (
    <>
      <WageringBox 
        gameMatchAddress="0x..."
        onMatchCreated={(id) => console.log('Match created:', id)}
        onMatchJoined={(id) => console.log('Joined match:', id)}
      />
      <LeaderBoard 
        scoreBoardAddress="0x..."
        limit={10}
        sortBy="wins"
        showStats={true}
      />
    </>
  )
}
```

### Demo Applications

The main app includes interactive demos showcasing SDK components:

- **Tic-Tac-Toe** (`/demos/tic-tac-toe`) - Full wagered game implementation using both components
- **Leaderboard Demo** (`/demos/leaderboard`) - Interactive leaderboard configuration showcase

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

The demo application showcases SDK components in action. It includes:
- Interactive game demos (tic-tac-toe)
- Component showcases (leaderboard)
- Internal contract testing interface

#### Quick Start with Anvil (Local Development)

1. **Start local Anvil node**:
   ```bash
   anvil
   ```

2. **Deploy contracts**:
   ```bash
   # Deploy the GameMatchFactory
   forge script contracts/script/DeployGameMatchFactory.s.sol:DeployGameMatchFactory \
     --rpc-url http://localhost:8545 \
     --broadcast
   
   # Deploy the ScoreBoardFactory (optional, for leaderboard features)
   forge script contracts/script/DeployScoreBoardFactory.s.sol:DeployScoreBoardFactory \
     --rpc-url http://localhost:8545 \
     --broadcast
   ```

3. **Configure environment**:
   ```bash
   # Copy the example env file
   cp .env.example .env.local
   
   # Edit .env.local and set the addresses from deployment output
   # Example:
   # NEXT_PUBLIC_GAME_MATCH_FACTORY=0x5FbDB2315678afecb367f032d93F642f64180aa3
   # NEXT_PUBLIC_SCOREBOARD_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   ```

4. **Run the app**:
   ```bash
   npm run dev
   ```

5. **Explore the demos**:
   - Open http://localhost:3000
   - Try the **Tic-Tac-Toe** demo to see wagering in action
   - Visit the **Leaderboard Demo** to explore ranking features
   - Use the **Contract Testing** section to deploy and test contracts directly

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
