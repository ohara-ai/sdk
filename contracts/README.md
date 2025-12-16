# Smart Contracts

Solidity smart contracts for modular on-chain features. This package provides factory-based contract deployment for features with built-in fee collection and access control.

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

#### **Match** (`src/features/game/Match.sol`)

Escrow-based match system with stake management.

**Key Features:**

- Create matches with configurable stake amounts and player limits
- Join/leave from matches before activation
- Controller-managed activation and finalization
- Automatic fee distribution on match completion
- Share accrual for registered recipients (e.g., Prize contracts)
- Integration with Score for result tracking
- Capacity management with configurable active match limits

**Main Functions:**

- `create(token, stakeAmount, maxPlayers)` - Create a new match
- `join(matchId)` - Join an existing match
- `leave(matchId)` - Leave a match before activation
- `activate(matchId)` - Controller activates a full match
- `finalize(matchId, winner)` - Controller finalizes and distributes stakes
- `registerShareRecipient(recipient, basisPoints)` - Register share recipient
- `claimShares(token)` - Claim accrued shares

#### **Score** (`src/features/game/Score.sol`)

Tracks and stores player scores from completed matches.

**Key Features:**

- Record match results with winner/loser tracking
- Query player statistics (wins, total prize, last match)
- Leaderboard queries (top players by wins/prize)
- Storage limits to prevent state explosion
- Authorized recorder system for match contracts
- Optional Prize contract integration for prize pool tracking

**Main Functions:**

- `recordMatchResult(winner, losers, prize)` - Record match results
- `getPlayerScore(player)` - Get player statistics
- `getTopPlayersByWins(count)` - Query top N players by wins
- `getTopPlayersByPrize(count)` - Query top N players by total prize
- `setPrize(prize)` - Set Prize contract for pool tracking

#### **Prize** (`src/features/game/Prize.sol`)

Pool-based prize distribution system that collects shares from match wagers.

**Key Features:**

- Pool-based prize distribution (configurable matches per pool)
- Collects shares from Match contract wagers
- Tracks wins per player per pool
- Winner determined by most wins in pool
- Supports native ETH and ERC20 tokens
- Pull-based prize claiming

**Main Functions:**

- `recordMatchResult(winner)` - Record a match winner (called by Score)
- `claimPrize(poolId)` - Claim won prize for a finalized pool
- `getPool(poolId)` - Get pool information
- `getClaimablePools(player)` - Get pools claimable by a player
- `setMatchesPerPool(count)` - Configure matches per prize pool

### Factories

#### **MatchFactory** (`src/factories/MatchFactory.sol`)

Factory for deploying Match contracts with configurable defaults.

**Features:**

- Deploy Match instances with custom parameters
- Configure default max active matches
- Set default fee recipients and shares
- Owner-controlled factory settings

#### **ScoreFactory** (`src/factories/ScoreFactory.sol`)

Factory for deploying Score contracts with storage limits.

**Features:**

- Deploy Score instances with capacity limits
- Configure maximum losers per match, total players, and total matches
- Prevent state explosion with configurable bounds

#### **PrizeFactory** (`src/factories/PrizeFactory.sol`)

Factory for deploying Prize contracts with configurable pool settings.

**Features:**

- Deploy Prize instances with custom matches per pool
- Configure default matches per pool
- ERC-1167 minimal proxy cloning for gas efficiency

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

# Generate coverage report
npm run forge:coverage

# Run specific test file
forge test --match-path contracts/test/Match.t.sol

# Run specific test function
forge test --match-test testCreateMatch
```

## Deployment

### Local Deployment (Anvil)

```bash
# Start local node
anvil

# Deploy MatchFactory
forge script script/DeployMatchFactory.s.sol --rpc-url http://localhost:8545 --broadcast

# Deploy ScoreFactory
forge script script/DeployScoreFactory.s.sol --rpc-url http://localhost:8545 --broadcast
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
   forge script script/DeployMatchFactory.s.sol --rpc-url sepolia --broadcast --verify
   ```

## Security Considerations

### Access Control

- **Owner Role:** Contract configuration and fee management
- **Controller Role:** Match activation, finalization, and score recording
- Clear separation of concerns between roles

### State Management

- Capacity limits on active matches to prevent DoS
- Storage limits on Score to prevent state explosion
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
