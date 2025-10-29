# Smart Contracts

Solidity smart contracts for modular on-chain gaming features. This package provides factory-based contract deployment for match systems and scoreboards with built-in fee collection and access control.

## Architecture

The contracts follow a modular factory pattern with the following components:

```
contracts/
├── src/
│   ├── base/           # Base contracts and utilities
│   ├── factories/      # Factory contracts for deployments
│   ├── features/       # Core game feature contracts
│   └── interfaces/     # Contract interfaces
├── script/             # Deployment scripts
└── test/               # Contract tests
```

## Core Contracts

### Features

#### **GameMatch** (`src/features/game/GameMatch.sol`)

Escrow-based match system with stake management.

**Key Features:**
- Create matches with configurable stake amounts and player limits
- Join/withdraw from matches before activation
- Controller-managed activation and finalization
- Automatic fee distribution on match completion
- Integration with GameScore for result tracking
- Capacity management with configurable active match limits

**Main Functions:**
- `createMatch(token, stakeAmount, maxPlayers)` - Create a new match
- `joinMatch(matchId)` - Join an existing match
- `withdrawFromMatch(matchId)` - Leave a match before activation
- `activateMatch(matchId)` - Controller activates a full match
- `finalizeMatch(matchId, winner, losers)` - Controller finalizes and distributes stakes

#### **GameScore** (`src/features/game/GameScore.sol`)

Tracks and stores player scores from completed matches.

**Key Features:**
- Record match results with winner/loser tracking
- Query player statistics (wins, total prize, last match)
- Leaderboard queries (top players by wins/prize)
- Storage limits to prevent state explosion
- Authorized recorder system for match contracts

**Main Functions:**
- `recordScore(matchId, winner, losers, prize)` - Record match results
- `getScore(player)` - Get player statistics
- `getTopPlayersByWins(count)` - Query top N players by wins
- `getTopPlayersByPrize(count)` - Query top N players by total prize

### Factories

#### **GameMatchFactory** (`src/factories/GameMatchFactory.sol`)

Factory for deploying GameMatch contracts with configurable defaults.

**Features:**
- Deploy GameMatch instances with custom parameters
- Configure default max active matches
- Set default fee recipients and shares
- Owner-controlled factory settings

#### **GameScoreFactory** (`src/factories/GameScoreFactory.sol`)

Factory for deploying GameScore contracts with storage limits.

**Features:**
- Deploy GameScore instances with capacity limits
- Configure maximum losers per match, total players, and total matches
- Prevent state explosion with configurable bounds

### Base Contracts

#### **FeatureController** (`src/base/FeatureController.sol`)

Access control base for feature contracts with separate owner and controller roles.

#### **FeeCollector** (`src/base/FeeCollector.sol`)

Fee collection and distribution system supporting:
- Multiple fee recipients with configurable shares (basis points)
- ETH and ERC20 token fee distribution
- Owner-controlled fee configuration

#### **Owned** & **OwnedFactory** (`src/base/Owned.sol`, `src/base/OwnedFactory.sol`)

Basic ownership contracts with transfer capabilities.

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Solidity 0.8.23

### Build

```bash
# From repository root
npm run forge:build

# Or directly with forge
forge build
```

### Testing

```bash
# Run all tests
npm run forge:test

# Run with verbose output
npm run forge:test:verbose

# Generate coverage report
npm run forge:coverage

# Run specific test file
forge test --match-path contracts/test/GameMatch.t.sol

# Run specific test function
forge test --match-test testCreateMatch
```

### Test Coverage

The test suite includes:
- **GameMatch.t.sol** - Match creation, joining, activation, and finalization
- **GameMatchFactory.t.sol** - Factory deployment and configuration
- **GameScore.t.sol** - Score recording, queries, and leaderboards
- **GameScoreFactory.t.sol** - Factory deployment with limits
- **FeeCollectorValidation.t.sol** - Fee distribution validation

## Deployment

### Local Deployment (Anvil)

```bash
# Start local node
anvil

# Deploy GameMatchFactory
forge script script/DeployGameMatchFactory.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy GameScoreFactory
forge script script/DeployGameScoreFactory.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Testnet/Mainnet Deployment

1. Configure RPC endpoints in `foundry.toml`:
   ```toml
   [rpc_endpoints]
   sepolia = "${SEPOLIA_RPC_URL}"
   mainnet = "${MAINNET_RPC_URL}"
   ```

2. Set environment variables:
   ```bash
   export SEPOLIA_RPC_URL="your-rpc-url"
   export PRIVATE_KEY="your-private-key"
   ```

3. Deploy:
   ```bash
   forge script script/DeployGameMatchFactory.s.sol --rpc-url sepolia --broadcast --verify
   ```

## Configuration

### Foundry Settings (`foundry.toml`)

- **Solc Version:** 0.8.23
- **Optimizer:** Enabled with 200 runs
- **Via IR:** Enabled for better optimization
- **Test Settings:** 256 fuzz runs (10000 in CI)

### Gas Optimization

The contracts use:
- Via IR compilation for optimal gas usage
- Packed storage slots where possible
- Efficient array management with index tracking
- Minimal external calls

## Security Considerations

### Access Control

- **Owner Role:** Contract configuration and fee management
- **Controller Role:** Match activation, finalization, and score recording
- Clear separation of concerns between roles

### State Management

- Capacity limits on active matches to prevent DoS
- Storage limits on GameScore to prevent state explosion
- Proper index tracking for array cleanup

### Fee Distribution

- Basis point fee shares (100 = 1%, max 10000 = 100%)
- Validation of fee configuration before acceptance
- Safe transfer patterns for ETH and ERC20 tokens

### Reentrancy Protection

- State updates before external calls
- Pull-based withdrawal patterns where applicable

## Integration

The contracts are designed to integrate with the TypeScript SDK (`../sdk`). After building contracts, update ABIs:

```bash
npm run sdk:update-abi
```

This copies the compiled ABIs to the SDK for TypeScript integration.

## License

MIT
