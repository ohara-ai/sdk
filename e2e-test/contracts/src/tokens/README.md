# Development Tokens

This directory contains reference ERC20 tokens for development and testing purposes.

## DEVWORLD Token

**Purpose**: A reference ERC20 token for development environments that can be used with features requiring ERC20 token support (e.g., GameMatch).

### Specifications

- **Name**: DEVWORLD
- **Symbol**: DEVWORLD
- **Decimals**: 18
- **Mintable**: Yes (owner only)
- **Initial Supply**: Configurable at deployment (default: 1,000,000 tokens)

### Features

- ✅ Standard ERC20 interface (`transfer`, `transferFrom`, `approve`)
- ✅ Minting capability for the owner
- ✅ Ownership transfer
- ✅ Custom errors for better gas efficiency
- ✅ Comprehensive test coverage

### Deployment

```bash
# Deploy to local node (from e2e-test directory)
npm run deploy-devworld-token

# Or using forge directly
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url http://localhost:8545 --broadcast

# Deploy to testnet
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url sepolia --broadcast --verify
```

### Usage Examples

#### In Solidity Tests

```solidity
import {DevWorldToken} from "../src/tokens/DevWorldToken.sol";

// Deploy with initial supply
DevWorldToken token = new DevWorldToken(1_000_000 * 10**18);

// Mint additional tokens (owner only)
token.mint(recipient, 1000 * 10**18);

// Use with GameMatch
gameMatch.createMatch(address(token), stakeAmount, maxPlayers);
```

#### In TypeScript/Frontend

```typescript
// After deployment, use the token address
const DEVWORLD_ADDRESS = "0x...";

// Approve GameMatch to spend tokens
await writeContract({
  address: DEVWORLD_ADDRESS,
  abi: ERC20_ABI,
  functionName: "approve",
  args: [gameMatchAddress, stakeAmount]
});

// Create a match with DEVWORLD
await writeContract({
  address: gameMatchAddress,
  abi: GAME_MATCH_ABI,
  functionName: "createMatch",
  args: [DEVWORLD_ADDRESS, stakeAmount, maxPlayers]
});
```

### Testing

Run the comprehensive test suite:

```bash
# From e2e-test directory
forge test --match-contract DevWorldTokenTest

# Or from root
cd e2e-test && forge test --match-contract DevWorldTokenTest
```

The test suite covers:
- Initial state verification
- Token transfers
- Approve/transferFrom functionality
- Minting (owner only)
- Ownership transfer
- Error conditions (insufficient balance, insufficient allowance, unauthorized)

### Security Considerations

⚠️ **Development Only**: This token is designed for development and testing purposes. It includes unrestricted minting, which is appropriate for testing but not for production use.

For production deployments:
- Consider using audited ERC20 implementations (e.g., OpenZeppelin)
- Implement proper supply controls
- Add comprehensive access control
- Conduct security audits

### Contract Address

After deployment, add the contract address to your `.env` file:

```
NEXT_PUBLIC_DEVWORLD_TOKEN=0x...
```
