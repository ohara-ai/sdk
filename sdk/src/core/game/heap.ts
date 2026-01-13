import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { HEAP_ABI } from '../../abis/game/heap'
import type { OharaApiClient } from '../../server/oharaApiClient'

/**
 * Heap primitive - Core on-chain heap operations
 * Abstracts blockchain primitives for heap management
 */

export interface HeapConfig {
  token: Address
  contributionAmount: bigint
  maxContributions: number
}

export interface Heap {
  id: bigint
  token: Address
  contributionAmount: bigint
  maxContributions: number
  contributors: readonly Address[]
  status: HeapStatus
  winner: Address
  createdAt: bigint
  totalPrize: bigint
}

export enum HeapStatus {
  Open = 0,
  Active = 1,
  Finalized = 2,
  Cancelled = 3,
}

/**
 * Client-side heap operations (safe for user wallet)
 */
export interface HeapOperations {
  /**
   * Create a new heap with specified configuration
   * Returns the created heap ID
   */
  create(config: HeapConfig): Promise<bigint>

  /**
   * Contribute to an existing open heap
   * Returns true on success
   */
  contribute(heapId: bigint): Promise<boolean>

  /**
   * Withdraw contribution from an open heap (before activation)
   * Returns true on success
   */
  withdraw(heapId: bigint): Promise<boolean>

  /**
   * Get heap details
   */
  get(heapId: bigint): Promise<Heap>

  /**
   * Get active heaps (paginated)
   */
  getActiveHeaps(offset?: number, limit?: number): Promise<readonly bigint[]>

  /**
   * Get the total count of active heaps
   */
  getActiveHeapCount(): Promise<bigint>

  /**
   * Get the maximum number of active heaps allowed
   */
  getMaxActiveHeaps(): Promise<bigint>

  /**
   * Get fee configuration (recipients, shares, totalShare)
   */
  getFeeConfiguration(): Promise<{
    recipients: readonly Address[]
    shares: readonly bigint[]
    totalShare: bigint
  }>

  /**
   * Get contributor's contribution in a heap
   */
  getContribution(heapId: bigint, contributor: Address): Promise<bigint>

  /**
   * Withdraw accumulated fees (for fee recipients only)
   * @param token The token address (use zeroAddress for native token/ETH)
   */
  withdrawFees(token: Address): Promise<Hash>

  /**
   * Get pending fees for a recipient
   * @param recipient The fee recipient address
   * @param token The token address (use zeroAddress for native token/ETH)
   */
  getPendingFees(recipient: Address, token: Address): Promise<bigint>

  /**
   * Get share configuration (recipients, shares, totalShareBasisPoints)
   */
  getShareConfiguration(): Promise<{
    recipients: readonly Address[]
    shares: readonly bigint[]
    totalShareBasisPoints: bigint
  }>

  /**
   * Get pending shares for a recipient
   * @param recipient The share recipient address
   * @param token The token address (use zeroAddress for native token/ETH)
   */
  getPendingShares(recipient: Address, token: Address): Promise<bigint>
}

/**
 * Server-only heap operations (requires controller wallet)
 * These operations should only be called from API routes using createServerOharaAi()
 */
export interface ServerHeapOperations extends HeapOperations {
  /**
   * Activate an open heap (controller only - server-side only)
   * Returns true on success
   */
  activate(heapId: bigint): Promise<boolean>

  /**
   * Finalize an active heap with a winner (controller only - server-side only)
   * Pass address(0) as winner to cancel and refund all contributors
   * Returns true on success
   */
  finalize(heapId: bigint, winner: Address): Promise<boolean>

  /**
   * Cancel an active heap and refund all contributors (controller only - server-side only)
   * Returns true on success
   */
  cancel(heapId: bigint): Promise<boolean>
}

/**
 * Create client-side Heap operations (excludes server-only operations)
 * This should be used in client components and providers
 */
export function createClientHeapOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
): HeapOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    walletClient,
    false,
  ) as HeapOperations
}

/**
 * Create Heap operations for a specific Heap contract
 * For server-side (controller wallet): returns ServerHeapOperations
 */
// Overload: without wallet client, returns base operations
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined,
  oharaApiClient?: undefined,
  chainId?: undefined,
): HeapOperations

// Overload: with wallet client, returns server operations (includes activate/finalize/cancel)
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ServerHeapOperations

// Implementation
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): HeapOperations | ServerHeapOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    walletClient,
    true,
    oharaApiClient,
    chainId,
  )
}

/**
 * Internal function to create heap operations
 */
function createOperationsInternal(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  includeServerOps: boolean = true,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): HeapOperations | ServerHeapOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for heap operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  const baseOperations: HeapOperations = {
    async create(config: HeapConfig): Promise<bigint> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) {
        throw new Error('Wallet account is required')
      }

      const isNativeToken =
        config.token === '0x0000000000000000000000000000000000000000'

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'create',
        args: [config.token, config.contributionAmount, BigInt(config.maxContributions)],
        value: isNativeToken ? config.contributionAmount : 0n,
        account,
        chain: wallet.chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Extract heapId from HeapCreated event
      const heapCreatedLog = receipt.logs.find((log) => {
        return log.topics.length >= 2
      })

      if (heapCreatedLog && heapCreatedLog.topics[1]) {
        return BigInt(heapCreatedLog.topics[1])
      }

      throw new Error('Could not extract heapId from transaction logs')
    },

    async contribute(heapId: bigint): Promise<boolean> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) {
        throw new Error('Wallet account is required')
      }

      // Get heap to determine contribution amount and token
      const heap = await this.get(heapId)
      const isNativeToken =
        heap.token === '0x0000000000000000000000000000000000000000'

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'contribute',
        args: [heapId],
        value: isNativeToken ? heap.contributionAmount : 0n,
        account,
        chain: wallet.chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      return receipt.status === 'success'
    },

    async withdraw(heapId: bigint): Promise<boolean> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) {
        throw new Error('Wallet account is required')
      }

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'withdraw',
        args: [heapId],
        account,
        chain: wallet.chain,
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      return receipt.status === 'success'
    },

    async get(heapId: bigint): Promise<Heap> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getHeap',
        args: [heapId],
      })) as [Address, bigint, bigint, readonly Address[], number, Address, bigint]

      const [token, contributionAmount, maxContributions, contributors, status, winner, createdAt] =
        result

      return {
        id: heapId,
        token,
        contributionAmount,
        maxContributions: Number(maxContributions),
        contributors,
        status: status as HeapStatus,
        winner,
        createdAt,
        totalPrize: contributionAmount * BigInt(contributors.length),
      }
    },

    async getActiveHeaps(
      offset: number = 0,
      limit: number = 100,
    ): Promise<readonly bigint[]> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getActiveHeapIds',
        args: [BigInt(offset), BigInt(limit)],
      })) as readonly bigint[]

      return result
    },

    async getActiveHeapCount(): Promise<bigint> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getActiveHeapCount',
      })) as bigint

      return result
    },

    async getMaxActiveHeaps(): Promise<bigint> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'maxActiveHeaps',
      })) as bigint

      return result
    },

    async getFeeConfiguration(): Promise<{
      recipients: readonly Address[]
      shares: readonly bigint[]
      totalShare: bigint
    }> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getFeeConfiguration',
      })) as [readonly Address[], readonly bigint[], bigint]

      return {
        recipients: result[0],
        shares: result[1],
        totalShare: result[2],
      }
    },

    async getContribution(heapId: bigint, contributor: Address): Promise<bigint> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getContribution',
        args: [heapId, contributor],
      })) as bigint

      return result
    },

    async withdrawFees(token: Address): Promise<Hash> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) {
        throw new Error('Wallet account is required')
      }

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'withdrawFees',
        args: [token],
        account,
        chain: wallet.chain,
      })

      return hash
    },

    async getPendingFees(recipient: Address, token: Address): Promise<bigint> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'pendingFees',
        args: [recipient, token],
      })) as bigint

      return result
    },

    async getShareConfiguration(): Promise<{
      recipients: readonly Address[]
      shares: readonly bigint[]
      totalShareBasisPoints: bigint
    }> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getShareRecipients',
      })) as [readonly Address[], readonly bigint[]]

      const totalShareBasisPoints = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'totalShareBasisPoints',
      })) as bigint

      return {
        recipients: result[0],
        shares: result[1],
        totalShareBasisPoints,
      }
    },

    async getPendingShares(recipient: Address, token: Address): Promise<bigint> {
      const result = (await publicClient.readContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'getPendingShares',
        args: [recipient, token],
      })) as bigint

      return result
    },
  }

  // Return base operations if server ops not needed
  if (!includeServerOps) {
    return baseOperations
  }

  // Server operations include activate, finalize, and cancel (controller wallet only)
  const serverOperations: ServerHeapOperations = {
    ...baseOperations,

    async activate(heapId: bigint): Promise<boolean> {
      // If API mode is enabled, use Ohara API
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'activate',
          params: { heapId: heapId.toString() },
          chainId,
        })

        // Wait for transaction confirmation
        const status = await oharaApiClient.waitForTransaction(
          result.data.txHash,
        )

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return true
      }

      // Otherwise, use direct on-chain execution
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'activate',
        args: [heapId],
        account,
        chain: undefined,
      })

      // Wait for the transaction receipt
      await publicClient.waitForTransactionReceipt({ hash })

      return true
    },

    async finalize(heapId: bigint, winner: Address): Promise<boolean> {
      // If API mode is enabled, use Ohara API
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'finalize',
          params: {
            heapId: heapId.toString(),
            winner: winner,
          },
          chainId,
        })

        // Wait for transaction confirmation
        const status = await oharaApiClient.waitForTransaction(
          result.data.txHash,
        )

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return true
      }

      // Otherwise, use direct on-chain execution
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'finalize',
        args: [heapId, winner],
        account,
        chain: undefined,
      })

      // Wait for the transaction receipt
      await publicClient.waitForTransactionReceipt({ hash })

      return true
    },

    async cancel(heapId: bigint): Promise<boolean> {
      // If API mode is enabled, use Ohara API
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'cancel',
          params: { heapId: heapId.toString() },
          chainId,
        })

        // Wait for transaction confirmation
        const status = await oharaApiClient.waitForTransaction(
          result.data.txHash,
        )

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return true
      }

      // Otherwise, use direct on-chain execution
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'cancel',
        args: [heapId],
        account,
        chain: undefined,
      })

      // Wait for the transaction receipt
      await publicClient.waitForTransactionReceipt({ hash })

      return true
    },
  }

  return serverOperations
}
