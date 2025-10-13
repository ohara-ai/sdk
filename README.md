# On-Chain Features

A repository for modular on-chain gaming features with Solidity smart contracts and interactive demo applications.

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
├── app/                # Next.js demo application
├── components/         # React components
└── lib/                # Utilities and helpers
```

## Features

For detailed information about implemented and proposed features, see the [`proposals/`](./proposals/) directory. Each feature has its own design document with specifications, use cases, and implementation details.

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

## License

MIT
