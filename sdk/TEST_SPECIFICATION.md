# SDK Test Specification

This document outlines the specification-driven test suite for the OharaAI Game SDK.

## Overview

The test suite follows a **specification-driven approach** where each test validates a specific behavioral requirement or contract of the SDK. Tests are organized by module and use the `SPEC:` prefix to clearly identify the specification being validated.

## Test Organization

```
sdk/src/
├── __tests__/
│   ├── setup.ts                    # Global test setup and configuration
│   ├── mocks/
│   │   └── clients.ts              # Mock blockchain clients and data
│   └── utils/
│       └── assertions.ts           # Custom assertion helpers
├── core/
│   ├── match.spec.ts               # Match operations specifications
│   ├── scores.spec.ts              # Score operations specifications
│   └── app.spec.ts                 # App operations specifications
├── deployment/
│   ├── deploymentService.spec.ts   # Deployment utilities specifications
│   └── deployment.integration.spec.ts # End-to-end deployment specs
├── hooks/
│   └── useTokenApproval.spec.ts    # Token approval hook specifications
└── context/
    └── OharaAiContext.spec.ts      # Context type specifications
```

## Test Coverage by Module

### Core Module - Match Operations (`core/match.spec.ts`)

**Total Specifications: 40+**

#### Factory Functions
- ✅ `createClientMatchOperations` creates client operations without server methods
- ✅ `createMatchOperations` with walletClient includes server operations
- ✅ `createMatchOperations` without walletClient returns base operations
- ✅ Throws error when publicClient is missing

#### Write Operations - Create Match
- ✅ Successfully creates match with native token (ETH)
- ✅ Successfully creates match with ERC20 token
- ✅ Sends correct value for native tokens
- ✅ Sends zero value for ERC20 tokens
- ✅ Throws when wallet client is missing
- ✅ Throws when account is missing

#### Write Operations - Join Match
- ✅ Successfully joins match with native token
- ✅ Reads match data before joining to get stake amount
- ✅ Calls contract with correct parameters

#### Write Operations - Withdraw
- ✅ Successfully withdraws stake from match

#### Read Operations - Get Match
- ✅ Returns complete match object with all fields
- ✅ Calculates totalPrize correctly (stakeAmount × players.length)
- ✅ Calls contract with correct parameters
- ✅ Handles different match statuses

#### Read Operations - Active Matches
- ✅ Fetches all matches when no limit specified
- ✅ Respects offset and limit parameters
- ✅ Returns total active match count
- ✅ Returns maximum allowed active matches

#### Read Operations - Fee Configuration
- ✅ Returns fee configuration structure
- ✅ Returns player stake for a match

#### Server Operations
- ✅ Controller can activate a match
- ✅ Controller can finalize a match with winner
- ✅ Uses correct contract function names

#### Error Handling
- ✅ Operations fail gracefully when wallet operations throw
- ✅ Read operations fail gracefully when contract call fails

### Core Module - Score Operations (`core/scores.spec.ts`)

**Total Specifications: 30+**

#### Factory Function
- ✅ `createScoreOperations` creates operations with all methods
- ✅ Throws error when publicClient is missing

#### Player Score Queries
- ✅ Returns complete player score object
- ✅ Calls contract with correct parameters
- ✅ Handles player with no wins

#### Leaderboard Queries
- ✅ Returns top players sorted by wins
- ✅ Returns top players sorted by prize
- ✅ Calls contract with limit parameter
- ✅ Converts number limit to BigInt
- ✅ Handles empty results
- ✅ Maintains consistent array lengths

#### System Statistics
- ✅ Returns total number of players
- ✅ Returns total number of matches
- ✅ Handles zero players/matches

#### System Limits
- ✅ Returns maximum losers allowed per match
- ✅ Returns maximum total players allowed
- ✅ Returns maximum total matches allowed

#### Read-Only Nature
- ✅ Score operations are read-only (no write methods)
- ✅ Does not require walletClient

#### Error Handling
- ✅ Handles contract call failures
- ✅ Handles invalid player addresses
- ✅ Handles network errors

#### Data Integrity
- ✅ Leaderboard data arrays maintain consistent lengths
- ✅ Player score includes player address for verification

### Core Module - App Operations (`core/app.spec.ts`)

**Total Specifications: 25+**

#### Factory Function
- ✅ Creates operations with both match and scores
- ✅ Works with only match address
- ✅ Works with only score address
- ✅ Works with no contract addresses
- ✅ Works without walletClient for read-only

#### Support Detection
- ✅ `hasMatchSupport()` returns true when configured
- ✅ `hasMatchSupport()` returns false when missing
- ✅ `hasScoreSupport()` returns true when configured
- ✅ `hasScoreSupport()` returns false when missing

#### Configuration Retrieval
- ✅ `getConfig()` returns the original configuration
- ✅ Reflects partial configuration

#### Operations Interface
- ✅ Match operations have expected methods
- ✅ Scores operations have expected methods
- ✅ App operations have utility methods

#### Client Type Enforcement
- ✅ Match operations use client operations (no server ops)

#### Dependency Resolution
- ✅ Operations are initialized independently
- ✅ Score operations do not require wallet client

### Deployment Module (`deployment/deploymentService.spec.ts`)

**Total Specifications: 20+**

#### Extract Deployed Address
- ✅ Extracts address from event logs
- ✅ Handles case-insensitive factory address matching
- ✅ Returns null when no matching logs
- ✅ Returns null when topics array too short
- ✅ Extracts last 40 characters as address
- ✅ Handles empty logs array

#### Create Deployment Clients
- ✅ Creates wallet and public clients
- ✅ Account derived from private key
- ✅ Wallet client has account attached
- ✅ Uses correct RPC URL

#### Get Deployment Config
- ✅ Throws when GAME_MATCH_FACTORY not set
- ✅ Throws when GAME_SCORE_FACTORY not set
- ✅ Uses default RPC URL when not set
- ✅ Returns complete config structure

#### Get Factory Addresses
- ✅ Returns factory addresses from environment
- ✅ Returns undefined when not set
- ✅ Handles partial configuration

### Deployment Integration (`deployment/deployment.integration.spec.ts`)

**Total Specifications: 15+**

#### Deploy GameMatch
- ✅ Successfully deploys with zero address
- ✅ Deploys with GameScore address
- ✅ Handles fee configuration
- ✅ Returns DeploymentResult structure
- ✅ Can include authorization warnings

#### Deploy GameScore
- ✅ Successfully deploys
- ✅ Returns DeploymentResult structure
- ✅ Does not require parameters

#### Error Handling
- ✅ Deployment fails when environment not configured
- ✅ Deployment fails when factory address missing

#### Storage Integration
- ✅ Saves address to storage after deployment

### Hooks Module (`hooks/useTokenApproval.spec.ts`)

**Total Specifications: 25+**

#### Hook Parameters
- ✅ UseTokenApprovalParams has required fields
- ✅ enabled is optional
- ✅ Accepts zero address for native token

#### Return Type
- ✅ UseTokenApprovalReturn has all required fields
- ✅ approve function signature is correct

#### Native Token Detection
- ✅ Zero address is recognized as native token
- ✅ Non-zero address is not native token

#### Approval Logic
- ✅ Approval needed when allowance < amount
- ✅ Approval not needed when allowance >= amount
- ✅ Approval not needed for native token
- ✅ Approval not needed when amount is zero
- ✅ Approval not needed when disabled

#### ERC20 Integration
- ✅ Allowance query uses correct contract parameters
- ✅ Approve transaction uses correct parameters

#### State Management
- ✅ Allowance defaults to 0n
- ✅ Error defaults to null
- ✅ Pending states default to false

#### Wagmi Integration
- ✅ Uses useAccount for user address
- ✅ Uses useReadContract for allowance
- ✅ Uses useWriteContract for approval
- ✅ Uses useWaitForTransactionReceipt for confirmation

### Context Module (`context/OharaAiContext.spec.ts`)

**Total Specifications: 30+**

#### Context Structures
- ✅ OharaContext has contracts object
- ✅ GameContext has match and scores properties
- ✅ ServerGameContext has same structure as GameContext
- ✅ AppContext has coin and controller properties
- ✅ InternalContext has chainId and factories

#### Complete Context
- ✅ OharaAiContext has all required top-level properties
- ✅ loadAddresses is an async function
- ✅ Can be fully populated
- ✅ Can be minimally populated

#### Hierarchical Organization
- ✅ Context follows domain-driven hierarchy
- ✅ Operations are nested within their domains

#### Type Safety
- ✅ Address type is used consistently
- ✅ Context types are structurally compatible

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- match.spec.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "SPEC: create"
```

## Test Utilities

### Mock Clients (`__tests__/mocks/clients.ts`)

- `createMockPublicClient()` - Mock viem PublicClient
- `createMockWalletClient()` - Mock viem WalletClient
- `createMockReceipt()` - Mock transaction receipt
- `createMockMatchData()` - Mock match contract data
- `createMockPlayerScore()` - Mock player score data
- `createMockTopPlayers()` - Mock leaderboard data
- `createMockFeeConfig()` - Mock fee configuration

### Assertions (`__tests__/utils/assertions.ts`)

- `assertValidAddress()` - Validate Ethereum address format
- `assertValidHash()` - Validate transaction hash format
- `assertPositiveBigInt()` - Validate positive BigInt
- `assertHasProperties()` - Validate object has properties
- `assertHasOperations()` - Validate operations object has methods

## Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Test Principles

1. **Specification-Driven**: Each test validates a specific behavioral requirement
2. **Isolated**: Tests do not depend on each other
3. **Fast**: Tests run quickly using mocks instead of real blockchain
4. **Readable**: Test names clearly describe what is being tested
5. **Maintainable**: Tests are organized logically by module
6. **Type-Safe**: Full TypeScript support in tests

## Future Test Additions

- [ ] E2E tests with real blockchain (testnet)
- [ ] React component integration tests
- [ ] Performance benchmarks
- [ ] Fuzz testing for edge cases
- [ ] Property-based testing for mathematical operations

## Contributing

When adding new features to the SDK:

1. Write specification tests first (TDD)
2. Use the `SPEC:` prefix in test names
3. Add to appropriate test file or create new one
4. Update this specification document
5. Ensure all tests pass before committing
