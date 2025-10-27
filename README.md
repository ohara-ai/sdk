# On-Chain Features

A comprehensive repository for modular on-chain gaming features with Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building gaming applications.

## SDK

The **OharaAI SDK** provides functional primitives for building on-chain gaming applications without dealing with blockchain complexity directly. The SDK uses a hierarchical context structure:

- **`game.match`** - Create, join, withdraw from matches, and query match data
- **`game.scores`** - Query player statistics and leaderboards
- **`internal.factories`** - Access to factory contract addresses
- **`app.controller`** - Controller address for server-side operations

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

#### Other Commands

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## License

MIT
