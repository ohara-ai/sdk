# Architecture Overview

This document describes the architectural decisions and organization of the on-chain features repository.

## Project Structure

The repository is organized into three main layers:

### 1. Contracts Layer (`/contracts`)

**Purpose**: Core smart contract implementations for on-chain gaming features.

- **Features** (`src/features/`): Individual gaming features like GameMatch and ScoreBoard
- **Base Contracts** (`src/base/`): Shared contracts like Owned, interfaces
- **Factories** (`src/factories/`): Contract factories for efficient deployment
- **Tests** (`test/`): Comprehensive Solidity tests
- **Scripts** (`script/`): Deployment scripts for various networks

**Key Design Principles**:
- Modular feature design - each feature is self-contained
- Gas optimization - efficient storage and computation patterns
- Security-first - authorization checks, reentrancy guards, validation
- Upgradability considerations through factory pattern

### 2. SDK Layer (`/sdk`)

**Purpose**: Production-ready UI components for developers to integrate gaming features.

**Architecture**:
```
sdk/
├── src/
│   ├── components/      # React UI components
│   │   ├── LeaderBoard.tsx
│   │   └── MatchBoard.tsx
│   ├── abis/            # Contract ABIs
│   ├── utils/           # Utility functions
│   └── index.ts         # Public exports
├── package.json         # NPM package configuration
└── README.md
```

**Design Philosophy**:
- **Self-contained**: Minimal external dependencies
- **Composable**: Components work independently or together
- **Customizable**: Props for styling and behavior
- **Production-ready**: Proper error handling and loading states

**Technology Stack**:
- React 18 with TypeScript
- Wagmi v2 for blockchain interactions
- TanStack Query for state management
- Radix UI for accessible primitives
- TailwindCSS for styling
- Lucide React for icons

### 3. Demo App Layer (`/app`)

**Purpose**: Showcase SDK components and provide testing environment.

**Organization**:
```
app/
├── demos/               # Public SDK demos
│   ├── tic-tac-toe/    # Full game implementation
│   └── leaderboard/    # Component showcase
├── contract-testing/    # Internal testing interface
└── page.tsx            # Landing page
```

**Design Goals**:
- **Educational**: Show developers how to use the SDK
- **Interactive**: Let users experience the features
- **Isolated**: Each demo is self-contained
- **Accessible**: Clear navigation and documentation

## Data Flow

### Component → Contract Interaction

```
User Action
    ↓
SDK Component (MatchBoard)
    ↓
Wagmi Hook (useWriteContract)
    ↓
Wallet Transaction
    ↓
Smart Contract (GameMatch)
    ↓
Event Emission
    ↓
Query Invalidation
    ↓
UI Update (LeaderBoard)
```

### State Management

1. **Blockchain State**: Source of truth, accessed via wagmi hooks
2. **Component State**: Local UI state (forms, modals, etc.)
3. **Query Cache**: TanStack Query caches contract reads
4. **Browser Storage**: Contract addresses and user preferences

## Key Architectural Decisions

### 1. SDK as Separate Package

**Decision**: The SDK is a standalone npm package within the monorepo.

**Rationale**:
- Clear separation between demo app and reusable components
- Can be published independently
- Forces good API design
- Easier to integrate into external projects

### 2. Demo App Organization

**Decision**: Split app into public demos and internal testing.

**Structure**:
- `/app/demos/*` - Public-facing component demonstrations
- `/app/contract-testing/*` - Internal development tools

**Rationale**:
- Clear distinction between end-user content and developer tools
- Public demos showcase SDK capabilities
- Internal testing remains accessible but separate
- Better information architecture for new users

### 3. Contract Factory Pattern

**Decision**: Use factory contracts for deploying feature instances.

**Benefits**:
- Consistent deployment process
- Lower gas costs (CREATE2)
- Easier to track deployments
- Version management

### 4. Component Design

**Decision**: Components are self-contained with minimal configuration.

**Principles**:
- Props over context (explicit is better than implicit)
- Built-in loading and error states
- Responsive and accessible by default
- Customizable via className prop

## Integration Points

### Between Contracts and SDK

- ABIs exported from SDK (`sdk/src/abis/`)
- Type-safe contract interactions via wagmi
- Event listening for real-time updates

### Between SDK and Demo App

- Demo app imports SDK components directly
- Shows real-world usage patterns
- Tests SDK components in production-like environment

## Security Considerations

### Contract Layer

- Ownership and authorization checks
- Reentrancy guards on state-changing functions
- Input validation on all external calls
- Fee recipient validation

### SDK Layer

- No private key handling (wallet-based only)
- Input sanitization on user inputs
- Safe BigInt operations
- Error boundaries for fault tolerance

### Demo App

- Contract addresses from environment variables
- No hardcoded private keys
- Clear separation of dev/prod configs

## Testing Strategy

### Contracts

- Unit tests for each function
- Integration tests for feature flows
- Gas optimization tests
- Fork tests for realistic scenarios

### SDK Components

- Component tests with React Testing Library
- Integration tests with mock wagmi
- Visual regression tests
- Accessibility tests

### Demo App

- End-to-end tests with Playwright
- User journey tests
- Cross-browser compatibility

## Deployment Architecture

### Contracts

1. Deploy base contracts (DevWorldToken, ScoreBoard)
2. Deploy factories
3. Deploy feature instances via factories
4. Configure authorizations and permissions

### SDK

1. Build SDK package (`npm run sdk:build`)
2. Publish to npm (or use locally)
3. Developers import in their apps

### Demo App

1. Configure contract addresses in `.env.local`
2. Build Next.js app (`npm run build`)
3. Deploy to hosting platform
4. Users access via browser

## Future Considerations

### SDK Enhancements

- Additional game features (tournaments, seasons)
- Mobile-optimized components
- Theme customization system
- Multi-chain support

### Contract Upgrades

- Proxy pattern for upgradability
- Migration tools for version updates
- Backward compatibility guarantees

### Demo App Evolution

- More game examples
- Component playground
- Interactive tutorials
- API documentation site

## Conclusion

This architecture supports:
- **Modularity**: Each layer is independent and composable
- **Reusability**: SDK components work across different apps
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new features and demos
- **Developer Experience**: Simple integration and clear examples
