# Browser E2E Tests

End-to-end browser tests for the Ohara AI SDK game contracts using Playwright.

## Architecture Overview

```
browser-tests/
├── fixtures/
│   ├── index.ts           # Centralized exports
│   ├── wallet.ts          # Anvil account configs & mock ethereum injection
│   └── test-helpers.ts    # Reusable page actions & multi-user utilities
├── match-flows.test.ts    # Match contract e2e tests
├── heap-flows.test.ts     # Heap contract e2e tests
├── score.test.ts          # Score contract UI tests
└── README.md              # This file
```

## Test Hierarchy

The tests are structured in layers, where **foundation tests** (Match, Heap) must pass before **integration tests** (Score, Prize, Tournament, League, Prediction) can be validated:

```
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Tournament  │ │   League    │ │       Prediction        ││
│  │ (Multiple   │ │ (Multiple   │ │ (Bets on Match/Heap     ││
│  │  Matches)   │ │  Matches)   │ │  outcomes)              ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│  ┌─────────────┐ ┌─────────────┐                            │
│  │    Score    │ │    Prize    │                            │
│  │ (Win/Loss   │ │ (Rewards    │                            │
│  │  tracking)  │ │  pool)      │                            │
│  └─────────────┘ └─────────────┘                            │
├─────────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                         │
│  ┌──────────────────────┐ ┌──────────────────────┐          │
│  │        Match         │ │         Heap         │          │
│  │  - Create match      │ │  - Create heap       │          │
│  │  - Join match        │ │  - Contribute        │          │
│  │  - Activate          │ │  - Activate          │          │
│  │  - Finalize          │ │  - Finalize          │          │
│  └──────────────────────┘ └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Anvil Test Accounts

Located in `fixtures/wallet.ts`:

| Account   | Address                                      | Use Case                    |
|-----------|----------------------------------------------|-----------------------------|
| deployer  | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  | Factory deployment          |
| user1     | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  | General testing             |
| user2     | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC  | Primary test user           |
| user3     | 0x90F79bf6EB2c4f870365E785982E1f101E93b906  | Secondary test user         |
| user4     | 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65  | Tournament/League testing   |

## Foundation Tests

### Match E2E Flow (`match-flows.test.ts`)

Tests the complete match lifecycle:
1. **User 1** (anvil account #2) creates a 2-player match with 1 ETH wager
2. **User 2** (anvil account #3) opens another page, connects wallet, joins the match
3. Match is activated
4. Match is finalized with a randomly selected winner

### Heap E2E Flow (`heap-flows.test.ts`)

Tests the complete heap lifecycle:
1. **User 1** creates a heap with sufficient max contributions
2. **User 1** adds additional contributions
3. **User 2** adds contributions to the heap
4. Heap is activated
5. Heap is finalized with **User 1** as winner

## Using Test Helpers

### Multi-User Testing Pattern

```typescript
import { createWalletContext, createMatchPageActions } from './fixtures'

test('multi-user match', async ({ browser }) => {
  // Create contexts with different wallets
  const user1Context = await createWalletContext(browser, 'user2')
  const user2Context = await createWalletContext(browser, 'user3')
  
  const user1Page = await user1Context.newPage()
  const user2Page = await user2Context.newPage()
  
  const user1Actions = createMatchPageActions(user1Page)
  const user2Actions = createMatchPageActions(user2Page)
  
  // User 1 creates match
  await user1Actions.setup()
  const matchId = await user1Actions.createMatch('1', 2)
  
  // User 2 joins
  await user2Actions.setup()
  await user2Actions.selectMatch(matchId)
  await user2Actions.joinMatch()
  
  // etc.
})
```

### Executing Multiple Matches/Heaps

For Tournament and League tests that require multiple completed matches:

```typescript
import { executeMultipleMatches, executeMultipleHeaps } from './fixtures'

test('tournament with multiple matches', async ({ browser }) => {
  // Execute 5 matches
  const matchResults = await executeMultipleMatches(browser, 5, {
    user1Account: 'user2',
    user2Account: 'user3',
    stakeAmount: '0.1'
  })
  
  // Use results for tournament verification
  console.log('Completed matches:', matchResults)
})
```

## Extending for Integration Tests

### Score Contract Tests

After executing Match/Heap flows, verify Score contract state:

```typescript
test('score tracks match results', async ({ browser }) => {
  // Execute a match
  const result = await executeMatchFlow(browser, {
    user1Account: 'user2',
    user2Account: 'user3',
    stakeAmount: '0.5',
    winnerIndex: 0 // User 1 wins
  })
  
  // Navigate to Score page and verify
  const page = await browser.newPage()
  await page.goto('/testing/features/game/score')
  // Verify winner appears in leaderboard
  // Verify stats updated
})
```

### Tournament/League Tests

These require multiple matches to be completed first:

```typescript
test('tournament with 4 matches', async ({ browser }) => {
  // Phase 1: Execute foundation matches
  const matches = await executeMultipleMatches(browser, 4, {
    user1Account: 'user2',
    user2Account: 'user3',
    stakeAmount: '0.1'
  })
  
  // Phase 2: Verify tournament UI reflects results
  // Navigate to tournament page
  // Check standings, brackets, etc.
})
```

### Prediction Contract Tests

Predictions can be placed on both Match and Heap outcomes:

```typescript
test('prediction on match outcome', async ({ browser }) => {
  // Phase 1: Create a match (don't finalize yet)
  const user1Context = await createWalletContext(browser, 'user2')
  const user1Page = await user1Context.newPage()
  const user1Actions = createMatchPageActions(user1Page)
  
  await user1Actions.setup()
  const matchId = await user1Actions.createMatch('1', 2)
  
  // Phase 2: Third user places prediction
  const predictorContext = await createWalletContext(browser, 'user4')
  const predictorPage = await predictorContext.newPage()
  await predictorPage.goto('/testing/features/game/prediction')
  // Place bet on match outcome
  
  // Phase 3: Complete the match
  // ... join, activate, finalize
  
  // Phase 4: Verify prediction payout
})
```

## Running Tests

```bash
# Run all browser tests
npm run test:browser

# Run specific test file
npx playwright test browser-tests/match-flows.test.ts

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test -g "complete match lifecycle"
```

## Prerequisites

1. Anvil running locally: `anvil`
2. Contracts deployed to local anvil
3. E2E test app running: `npm run dev` (in e2e-test directory)

## Test Data Cleanup

Tests are designed to be idempotent. Each test:
- Uses fresh browser contexts
- Creates new matches/heaps with auto-incrementing IDs
- Does not depend on previous test state

Match and Heap data is cleaned up on-chain after finalization, so completed competitions won't clutter the UI.
