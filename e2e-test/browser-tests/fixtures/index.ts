/**
 * Browser Test Fixtures
 * 
 * Centralized exports for all test utilities and fixtures
 */

// Wallet utilities
export {
  ANVIL_ACCOUNTS,
  createMockEthereumScript,
  test,
  expect,
  type AnvilAccount,
} from './wallet'

// Test helpers and page actions
export {
  createWalletContext,
  connectWallet,
  waitForWalletReady,
  createMatchPageActions,
  createHeapPageActions,
  executeMatchFlow,
  executeHeapFlow,
  executeMultipleMatches,
  executeMultipleHeaps,
  type MatchPageActions,
  type HeapPageActions,
  type CompletedMatch,
  type CompletedHeap,
} from './test-helpers'
