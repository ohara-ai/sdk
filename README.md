# On-Chain Features

A repository for modular on-chain gaming features with Solidity smart contracts and interactive demo applications.

## Structure

```
├── contracts/           # Solidity smart contracts
│   ├── src/
│   │   ├── base/       # Base contracts and utilities
│   │   ├── factories/  # Contract factories for efficient deployment
│   │   ├── features/   # Individual on-chain features
│   │   └── interfaces/ # Contract interfaces
│   ├── test/           # Solidity tests
│   └── script/         # Deployment scripts
├── app/                # Next.js demo application
├── components/         # React components
└── lib/                # Utilities and helpers
```

## Features

### Game Match (game-match)
An escrow-based match system where:
- Players stake tokens to create/join matches
- Stakes can be withdrawn before match activation
- Match activation locks stakes and fixes participants
- Controller finalizes match and distributes winnings
- Optional scoreboard integration
- Optional fee distribution to predefined addresses

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

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Adding New Features

1. Create new directory under `contracts/src/features/[feature-name]/`
2. Implement the feature contract
3. Add tests in `contracts/test/[feature-name]/`
4. Create demo UI in `app/features/[feature-name]/`
5. Update this README with feature documentation

## License

MIT
