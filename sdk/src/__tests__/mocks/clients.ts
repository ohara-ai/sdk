/**
 * Mock Blockchain Clients
 *
 * Provides mock implementations of viem PublicClient and WalletClient
 * for testing blockchain interactions without actual network calls
 */

import type { PublicClient, WalletClient, Address, Hash } from 'viem'
import { vi } from 'vitest'

/**
 * Creates a mock PublicClient with configurable return values
 */
export function createMockPublicClient(
  overrides?: Partial<PublicClient>,
): PublicClient {
  return {
    readContract: vi.fn(),
    getChainId: vi.fn().mockResolvedValue(31337), // Hardhat default chain ID
    waitForTransactionReceipt: vi.fn(),
    ...overrides,
  } as unknown as PublicClient
}

/**
 * Creates a mock WalletClient with configurable return values
 */
export function createMockWalletClient(
  accountAddress: Address = '0x1111111111111111111111111111111111111111',
  overrides?: Partial<WalletClient>,
): WalletClient {
  return {
    account: {
      address: accountAddress,
      type: 'json-rpc' as const,
    },
    writeContract: vi
      .fn()
      .mockResolvedValue(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash,
      ),
    chain: undefined,
    ...overrides,
  } as unknown as WalletClient
}

/**
 * Mock transaction receipt
 */
export function createMockReceipt(
  contractAddress: Address = '0x2222222222222222222222222222222222222222',
  matchId: bigint = 1n,
) {
  return ({
    blockHash:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash,
    blockNumber: 1n,
    contractAddress,
    cumulativeGasUsed: 100000n,
    effectiveGasPrice: 1000000000n,
    from: '0x1111111111111111111111111111111111111111' as Address,
    gasUsed: 50000n,
    logs: [
      {
        address: contractAddress,
        topics: [
          // MatchCreated event signature
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
          // matchId as first indexed parameter (topics[1])
          `0x${matchId.toString(16).padStart(64, '0')}` as `0x${string}`,
        ],
        data: '0x' as `0x${string}`,
        blockNumber: 1n,
        transactionHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash,
        transactionIndex: 0,
        blockHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash,
        logIndex: 0,
        removed: false,
      },
    ],
    logsBloom: '0x00' as `0x${string}`,
    status: 'success' as const,
    to: contractAddress,
    transactionHash:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash,
    transactionIndex: 0,
    type: 'eip1559' as const,
  }) as any
}

/**
 * Mock match data returned from contract
 */
export function createMockMatchData() {
  return [
    '0x0000000000000000000000000000000000000000', // token
    1000000000000000000n, // stakeAmount (1 ETH)
    2n, // maxPlayers
    ['0x1111111111111111111111111111111111111111'], // players
    0, // status (Open)
    '0x0000000000000000000000000000000000000000', // winner
    BigInt(Date.now()), // createdAt
  ]
}

/**
 * Mock player score data
 */
export function createMockPlayerScore() {
  return [
    5n, // totalWins
    10000000000000000000n, // totalPrize (10 ETH)
    3n, // lastMatchId
    BigInt(Date.now()), // lastWinTimestamp
  ]
}

/**
 * Mock top players data
 */
export function createMockTopPlayers() {
  return [
    [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ], // players
    [10n, 5n], // wins
    [20000000000000000000n, 10000000000000000000n], // prizes
  ]
}

/**
 * Mock fee configuration data
 */
export function createMockFeeConfig() {
  return [
    ['0x3333333333333333333333333333333333333333'], // recipients
    [100n], // shares
    10000n, // totalShare
  ]
}
