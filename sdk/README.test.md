# SDK Test Suite

A comprehensive specification-driven test suite for the OharaAI Game SDK.

## Quick Start

### Install Dependencies

```bash
cd sdk
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                    # Global test setup
│   ├── mocks/
│   │   └── clients.ts              # Mock blockchain clients
│   └── utils/
│       └── assertions.ts           # Custom assertions
├── core/
│   ├── match.spec.ts               # Match operations (40+ specs)
│   ├── scores.spec.ts              # Score operations (30+ specs)
│   └── app.spec.ts                 # App operations (25+ specs)
├── deployment/
│   ├── deploymentService.spec.ts   # Deployment utilities (20+ specs)
│   └── deployment.integration.spec.ts  # E2E deployment (15+ specs)
├── hooks/
│   └── useTokenApproval.spec.ts    # Token approval hook (25+ specs)
└── context/
    └── OharaAiContext.spec.ts      # Context types (30+ specs)
```

**Total: 180+ Specifications**

## What Makes These Tests "Specification-Driven"?

Each test validates a specific behavioral requirement or contract:

### ✅ Good Example
```typescript
it('SPEC: create() - successfully creates match with native token (ETH)', async () => {
  const config = {
    token: '0x0000000000000000000000000000000000000000',
    stakeAmount: 1000000000000000000n,
    maxPlayers: 2,
  }

  const hash = await operations.create(config)

  assertValidHash(hash)
  expect(walletClient.writeContract).toHaveBeenCalledWith(
    expect.objectContaining({
      functionName: 'createMatch',
      value: config.stakeAmount, // Native token requires value
    })
  )
})
```

**Why it's good:**
- Clear specification: "creates match with native token"
- Tests actual behavior, not implementation
- Validates the contract with the blockchain
- Self-documenting

### ❌ Bad Example
```typescript
it('should work', async () => {
  const result = await doSomething()
  expect(result).toBeTruthy()
})
```

**Why it's bad:**
- Vague specification
- No clear requirement being tested
- Not self-documenting
- Hard to understand intent

## Test Coverage

### By Module

| Module | Specs | Coverage |
|--------|-------|----------|
| Match Operations | 40+ | Core functionality |
| Score Operations | 30+ | Read-only queries |
| App Operations | 25+ | High-level API |
| Deployment | 35+ | Contract deployment |
| Hooks | 25+ | React integration |
| Context | 30+ | Type definitions |

### Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Key Testing Patterns

### 1. Mock Blockchain Clients

```typescript
import { createMockPublicClient, createMockWalletClient } from '../__tests__/mocks/clients'

const publicClient = createMockPublicClient()
const walletClient = createMockWalletClient(PLAYER_ADDRESS)
```

### 2. Specification-Driven Test Names

```typescript
it('SPEC: getTopPlayersByWins() - returns top players sorted by wins', async () => {
  // Test implementation
})
```

### 3. Custom Assertions

```typescript
import { assertValidHash, assertHasOperations } from '../__tests__/utils/assertions'

assertValidHash(transactionHash)
assertHasOperations(operations, ['create', 'join', 'withdraw'])
```

### 4. Test Data Factories

```typescript
import { createMockMatchData, createMockPlayerScore } from '../__tests__/mocks/clients'

vi.spyOn(publicClient, 'readContract').mockResolvedValue(createMockMatchData())
```

## Common Testing Scenarios

### Testing Write Operations

```typescript
it('SPEC: create() - successfully creates match', async () => {
  const config = { token: '0x...', stakeAmount: 1000n, maxPlayers: 2 }
  
  const hash = await operations.create(config)
  
  assertValidHash(hash)
  expect(walletClient.writeContract).toHaveBeenCalledWith(
    expect.objectContaining({
      functionName: 'createMatch',
      args: [config.token, config.stakeAmount, 2n],
    })
  )
})
```

### Testing Read Operations

```typescript
it('SPEC: get() - returns complete match object', async () => {
  vi.spyOn(publicClient, 'readContract').mockResolvedValue(mockMatchData)
  
  const match = await operations.get(1n)
  
  expect(match).toEqual({
    id: 1n,
    token: '0x...',
    stakeAmount: expect.any(BigInt),
    // ... other fields
  })
})
```

### Testing Error Handling

```typescript
it('SPEC: throws when wallet client is missing', async () => {
  const opsWithoutWallet = createClientMatchOperations(ADDRESS, publicClient)
  
  await expect(
    opsWithoutWallet.create(config)
  ).rejects.toThrow('WalletClient is required')
})
```

### Testing Type Structures

```typescript
it('SPEC: OharaAiContext - has all required properties', () => {
  const context: OharaAiContext = {
    ohara: { contracts: {} },
    game: { match: {}, scores: {} },
    app: { coin: {}, controller: {} },
    internal: {},
    loadAddresses: async () => {},
  }
  
  expect(context).toHaveProperty('ohara')
  expect(context).toHaveProperty('game')
})
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- match.spec.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "SPEC: create"
```

### Run with Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Writing New Tests

### 1. Choose the Right Location

- Core functionality → `src/core/*.spec.ts`
- Deployment → `src/deployment/*.spec.ts`
- React hooks → `src/hooks/*.spec.ts`
- Types → `src/context/*.spec.ts`

### 2. Follow the Pattern

```typescript
describe('Module Name - Specification Tests', () => {
  describe('Specification: Feature Group', () => {
    it('SPEC: specific behavior being tested', () => {
      // Arrange
      const input = setupTestData()
      
      // Act
      const result = performAction(input)
      
      // Assert
      expect(result).toEqual(expectedOutput)
    })
  })
})
```

### 3. Use Descriptive Names

- ✅ `SPEC: create() - successfully creates match with native token`
- ❌ `test create function`

### 4. Test One Thing

Each test should validate one specific behavior:

```typescript
// Good - tests one thing
it('SPEC: calculates totalPrize correctly', async () => {
  const match = await operations.get(1n)
  expect(match.totalPrize).toBe(stakeAmount * BigInt(players.length))
})

// Bad - tests multiple things
it('SPEC: match operations work', async () => {
  await operations.create(config)
  const match = await operations.get(1n)
  await operations.join(1n)
  // Too much!
})
```

### 5. Update Documentation

When adding tests, update:
- `TEST_SPECIFICATION.md` - Add spec count
- This file - Add to relevant section
- Coverage goals if needed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd sdk && npm ci
      - run: cd sdk && npm test
      - run: cd sdk && npm run test:coverage
```

## Troubleshooting

### Tests Timeout

Increase timeout in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 10000, // 10 seconds
  },
})
```

### Mock Not Working

Ensure mocks are set up before importing modules:

```typescript
vi.mock('../module', () => ({
  function: vi.fn(),
}))

import { function } from '../module' // Import after mock
```

### Type Errors

Make sure you're using the correct types:

```typescript
const address: Address = '0x...' // ✅
const address: string = '0x...'  // ❌
```

## Best Practices

1. **Keep tests isolated** - No shared state between tests
2. **Use factories** - `createMock*()` functions for test data
3. **Mock external dependencies** - Don't make real blockchain calls
4. **Test behavior, not implementation** - Focus on contracts/interfaces
5. **Make tests readable** - Future you will thank you
6. **Run tests before committing** - Catch issues early
7. **Maintain high coverage** - But don't chase 100%
8. **Update tests with code** - Tests are documentation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Viem Testing Guide](https://viem.sh/docs/testing.html)
- [TEST_SPECIFICATION.md](./TEST_SPECIFICATION.md) - Full specification list
- [Wagmi Testing](https://wagmi.sh/react/guides/testing)

## Contributing

When contributing to the SDK:

1. **Write tests first** (TDD approach)
2. **Use `SPEC:` prefix** in test names
3. **Add to appropriate test file**
4. **Update documentation**
5. **Ensure all tests pass**
6. **Check coverage doesn't drop**

## Questions?

Open an issue or check the [TEST_SPECIFICATION.md](./TEST_SPECIFICATION.md) for detailed specifications.
