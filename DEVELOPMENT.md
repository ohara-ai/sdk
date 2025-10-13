# Development Guide

This guide covers the development workflow for adding new on-chain features to this repository.

## Repository Structure

```
├── proposals/              # Feature proposals and design documents
│   ├── README.md          # Proposal process guide
│   ├── TEMPLATE.md        # Proposal template
│   └── 001-game-match.md  # Example proposal
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── base/          # Base contracts (Owned, FeatureController)
│   │   ├── factories/     # Factory contracts for deployment
│   │   ├── features/      # Individual feature implementations
│   │   │   └── game-match/
│   │   └── interfaces/    # Contract interfaces
│   ├── test/              # Foundry tests
│   │   └── mocks/         # Mock contracts for testing
│   └── script/            # Deployment scripts
├── app/                   # Next.js app directory
│   └── features/          # Feature-specific pages
├── components/            # React components
│   ├── ui/               # Reusable UI components (Radix UI)
│   └── features/         # Feature-specific components
└── lib/                   # Utilities and helpers
    └── contracts/         # Contract ABIs and configurations
```

## Adding a New Feature

### 0. Create a Proposal (Recommended)

Before implementing a new feature, create a proposal to document requirements and design:

1. Copy the template: `cp proposals/TEMPLATE.md proposals/XXX-feature-name.md`
2. Fill in all sections:
   - **Problem Statement**: What need does this address?
   - **Interface Specification**: Define the contract interface
   - **Integration**: Document dependencies and inter-contract communication
   - **Security Considerations**: Identify risks and mitigations
3. Share for review and iterate on design
4. Use the proposal as implementation guide

See [`proposals/README.md`](./proposals/README.md) for detailed guidance.

**Benefits of proposals:**
- Clear requirements before coding
- Better architectural decisions
- Easier review process
- AI-friendly documentation
- Reduced implementation churn

### 1. Smart Contract Development

#### Create the Contract Interface

Create a new interface in `contracts/src/interfaces/`:

```solidity
// contracts/src/interfaces/IYourFeature.sol
pragma solidity ^0.8.23;

interface IYourFeature {
    // Define events
    event SomethingHappened(...);
    
    // Define functions
    function doSomething(...) external;
}
```

#### Implement the Contract

Create your feature contract in `contracts/src/features/your-feature/`:

```solidity
// contracts/src/features/your-feature/YourFeature.sol
pragma solidity ^0.8.23;

import {IFeature} from "../../interfaces/IFeature.sol";
import {IYourFeature} from "../../interfaces/IYourFeature.sol";
import {FeatureController} from "../../base/FeatureController.sol";

contract YourFeature is IYourFeature, IFeature, FeatureController {
    constructor(address _owner, address _controller) 
        FeatureController(_owner, _controller) 
    {}
    
    // Implement IFeature
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
    
    function featureName() external pure returns (string memory) {
        return "YourFeature";
    }
    
    // Implement your feature logic
}
```

#### Create a Factory

Add a factory contract in `contracts/src/factories/`:

```solidity
// contracts/src/factories/YourFeatureFactory.sol
pragma solidity ^0.8.23;

import {YourFeature} from "../features/your-feature/YourFeature.sol";
import {Owned} from "../base/Owned.sol";

contract YourFeatureFactory is Owned {
    event YourFeatureDeployed(address indexed instance, address indexed owner);
    
    constructor() Owned(msg.sender) {}
    
    function deployYourFeature(address _owner, address _controller) 
        external returns (address) 
    {
        address instance = address(new YourFeature(_owner, _controller));
        emit YourFeatureDeployed(instance, _owner);
        return instance;
    }
}
```

### 2. Write Tests

Create comprehensive tests in `contracts/test/`:

```solidity
// contracts/test/YourFeature.t.sol
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {YourFeature} from "../src/features/your-feature/YourFeature.sol";

contract YourFeatureTest is Test {
    YourFeature public feature;
    
    function setUp() public {
        feature = new YourFeature(address(this), address(this));
    }
    
    function test_YourFeature() public {
        // Write your tests
    }
}
```

Run tests:
```bash
npm run forge:test
npm run forge:test:verbose  # For detailed output
npm run forge:coverage      # For coverage report
```

### 3. Create Demo UI

#### Add Contract ABI

Create ABI file in `lib/contracts/`:

```typescript
// lib/contracts/yourFeature.ts
export const YOUR_FEATURE_ABI = [
  // ... ABI entries
] as const

export interface YourFeatureData {
  // Define TypeScript types
}
```

#### Create Feature Page

Add a new page in `app/features/your-feature/`:

```tsx
// app/features/your-feature/page.tsx
'use client'

export default function YourFeaturePage() {
  return (
    <main className="min-h-screen p-8">
      {/* Your feature UI */}
    </main>
  )
}
```

#### Create Feature Components

Add components in `components/features/your-feature/`:

```tsx
// components/features/your-feature/YourComponent.tsx
export function YourComponent() {
  return (
    // Component implementation
  )
}
```

### 4. Deploy

Create deployment script:

```solidity
// contracts/script/DeployYourFeature.s.sol
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import {YourFeature} from "../src/features/your-feature/YourFeature.sol";
import {YourFeatureFactory} from "../src/factories/YourFeatureFactory.sol";

contract DeployYourFeature is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address controller = vm.envAddress("CONTROLLER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        YourFeatureFactory factory = new YourFeatureFactory();
        address instance = factory.deployYourFeature(msg.sender, controller);
        
        console.log("Factory:", address(factory));
        console.log("Instance:", instance);
        
        vm.stopBroadcast();
    }
}
```

Deploy:
```bash
forge script contracts/script/DeployYourFeature.s.sol:DeployYourFeature \
  --rpc-url sepolia --broadcast --verify
```

## Best Practices

### Smart Contracts

- **Use Factory Pattern**: Deploy features through factories for gas efficiency
- **Implement IFeature**: All features should implement the base IFeature interface
- **Use FeatureController**: Inherit from FeatureController for admin functionality
- **Emit Events**: Emit comprehensive events for all state changes
- **Gas Optimization**: Clean up unused data, use `via_ir` for optimization
- **Access Control**: Use owner and controller roles appropriately
- **Error Handling**: Use custom errors instead of require strings

### Testing

- **Comprehensive Coverage**: Test all functions and edge cases
- **Use Mocks**: Create mock contracts for dependencies
- **Fuzz Testing**: Use Foundry's fuzzing for robustness
- **Event Testing**: Verify event emissions
- **Access Control**: Test unauthorized access scenarios

### Frontend

- **Type Safety**: Use TypeScript for all frontend code
- **Component Reusability**: Create reusable UI components
- **Error Handling**: Handle contract errors gracefully
- **Loading States**: Show loading indicators for transactions
- **Wallet Integration**: Use Wagmi for wallet connections
- **Real-time Updates**: Use events to update UI state

## Development Workflow

1. **Propose**: Create feature proposal documenting requirements and interface
2. **Review Proposal**: Get feedback and iterate on design
3. **Implement**: Write the smart contract following the approved interface
4. **Test**: Write comprehensive tests (aim for 100% coverage)
5. **Deploy Locally**: Test on local hardhat network
6. **Build UI**: Create the demo interface
7. **Deploy Testnet**: Deploy to Sepolia for testing
8. **Document**: Update README and mark proposal as implemented
9. **Review Code**: Code review and security audit
10. **Deploy Mainnet**: Production deployment

## Development Tokens

### DEVWORLD Token

The DEVWORLD token is a reference ERC20 token for development and testing purposes. It's designed for use with features like GameMatch that require ERC20 token support.

**Token Details:**
- Name: `DEVWORLD`
- Symbol: `DEVWORLD`
- Decimals: `18`
- Mintable: Yes (owner only)
- Initial Supply: `1,000,000` tokens (configurable)

**Deploy DEVWORLD Token:**

```bash
# Deploy to local Anvil node
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url http://localhost:8545 --broadcast

# Deploy to testnet (e.g., Sepolia)
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url sepolia --broadcast --verify
```

After deployment, add the token address to your `.env`:
```
NEXT_PUBLIC_DEVWORLD_TOKEN=0x...
```

**Using DEVWORLD in Features:**

```solidity
// In tests or scripts
DevWorldToken token = new DevWorldToken(1_000_000 * 10**18);
token.mint(user, 1000 * 10**18);

// Use with GameMatch
gameMatch.createMatch(address(token), stakeAmount, maxPlayers);
```

## Useful Commands

```bash
# Smart Contracts
npm run forge:build          # Compile contracts
npm run forge:test           # Run tests
npm run forge:test:verbose   # Detailed test output
npm run forge:coverage       # Coverage report

# Frontend
npm run dev                  # Start dev server
npm run build                # Build for production
npm run lint                 # Lint code
npm test                     # Run frontend tests

# Local Development
anvil                        # Start local node (Terminal 1)
forge script ...             # Deploy to local node (Terminal 2)
npm run dev                  # Start frontend (Terminal 3)
```

## Security Considerations

- **Access Control**: Properly restrict admin functions
- **Reentrancy**: Use checks-effects-interactions pattern
- **Integer Overflow**: Solidity 0.8+ has built-in protection
- **External Calls**: Be careful with external contract calls
- **Input Validation**: Validate all user inputs
- **Testing**: Comprehensive test coverage is essential
- **Audits**: Consider professional audits for production

## Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Solidity Documentation](https://docs.soliditylang.org/)
