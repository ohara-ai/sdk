# Quick Start Guide

Get started with the on-chain features repository in minutes.

## Prerequisites

- Node.js 18+ installed
- Foundry installed ([installation guide](https://book.getfoundry.sh/getting-started/installation))
- Git initialized (already done)

## Installation

```bash
# Install Node dependencies
npm install

# Install Foundry dependencies
forge install foundry-rs/forge-std
```

## Smart Contract Development

### Build Contracts
```bash
npm run forge:build
```

### Run Tests
```bash
# Run all tests
npm run forge:test

# Run with detailed output
npm run forge:test:verbose

# Generate coverage report
npm run forge:coverage
```

### Local Development
```bash
# Terminal 1: Start local Ethereum node
anvil

# Terminal 2: Deploy contracts locally
# Deploy GameMatch
forge script contracts/script/DeployGameMatch.s.sol:DeployGameMatch \
  --rpc-url http://localhost:8545 --broadcast

# Deploy DEVWORLD token (for testing ERC20 features)
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url http://localhost:8545 --broadcast
```

Tips:
```
# Dump state 
anvil --dump-state .anvil-dev-state.json

# Load previously saved state
anvil --load-state .anvil-dev-state.json

```

## Demo Application

### Development Mode
```bash
npm run dev
```

Visit `http://localhost:3000` to see the demo application.

### Build for Production
```bash
npm run build
npm run start
```

## Testing the Game Match Feature

### Using Foundry Tests

The comprehensive test suite covers all functionality:

```bash
npm run forge:test
```

Key test scenarios:
- Creating matches with ETH and ERC20 tokens
- Players joining and withdrawing
- Match activation by controller
- Match finalization and prize distribution
- Fee distribution to recipients
- Scoreboard integration

### Using the Demo UI

1. Start the development server: `npm run dev`
2. Navigate to the Game Match feature
3. Connect your wallet (requires local node or testnet)
4. Create a match with stake amount and max players
5. Other players can join by staking the same amount
6. Controller activates the match (locks stakes)
7. Controller finalizes match and distributes prizes

**Note**: The demo UI currently uses mock data. To connect to actual contracts:
1. Deploy contracts to a network
2. Update contract addresses in `lib/contracts/gameMatch.ts`
3. Implement contract interactions in the UI components

## Next Steps

### Deploy to Testnet

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your credentials to `.env`:
```bash
PRIVATE_KEY=your_private_key
CONTROLLER_ADDRESS=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

3. Deploy to Sepolia:
```bash
forge script contracts/script/DeployGameMatch.s.sol:DeployGameMatch \
  --rpc-url sepolia --broadcast --verify
```

4. Update contract addresses in `lib/contracts/gameMatch.ts`

### Add Your Own Feature

Follow the [Development Guide](./DEVELOPMENT.md) to add new features:

1. Create contract interface in `contracts/src/interfaces/`
2. Implement feature in `contracts/src/features/your-feature/`
3. Create factory in `contracts/src/factories/`
4. Write tests in `contracts/test/`
5. Build demo UI in `app/features/your-feature/`

## Useful Resources

- **Main README**: Overview and architecture
- **DEVELOPMENT.md**: Detailed development guide
- **Foundry Book**: https://book.getfoundry.sh/
- **Next.js Docs**: https://nextjs.org/docs
- **Wagmi Docs**: https://wagmi.sh/

## Common Issues

### Foundry Installation
If `forge` command is not found:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Node Dependencies
If you encounter dependency issues:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Contract Compilation Errors
Ensure Foundry is up to date:
```bash
foundryup
```

## Project Structure Overview

```
.
├── contracts/           # Solidity contracts
│   ├── src/            # Source files
│   ├── test/           # Test files
│   └── script/         # Deployment scripts
├── app/                # Next.js pages
├── components/         # React components
├── lib/                # Utilities
├── package.json        # Node dependencies
└── foundry.toml        # Foundry config
```

## Need Help?

- Check the [Development Guide](./DEVELOPMENT.md) for detailed workflows
- Review test files for usage examples
- Examine existing feature implementations as reference
