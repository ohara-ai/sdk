import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { MATCH_ABI } from '../../abis/game/match'

/**
 * Match primitive - Core on-chain match operations
 * Abstracts blockchain primitives for match management
 */

export interface MatchConfig {
  token: Address
  stakeAmount: bigint
  maxPlayers: number
}

export interface Match {
  id: bigint
  token: Address
  stakeAmount: bigint
  maxPlayers: number
  players: readonly Address[]
  status: MatchStatus
  winner: Address
  createdAt: bigint
  totalPrize: bigint
}

export enum MatchStatus {
  Open = 0,
  Active = 1,
  Finalized = 2,
}

/**
 * Client-side match operations (safe for user wallet)
 */
export interface MatchOperations {
  /**
   * Create a new match with specified configuration
   */
  create(config: MatchConfig): Promise<Hash>
  
  /**
   * Join an existing open match
   */
  join(matchId: bigint): Promise<Hash>
  
  /**
   * Leave a match and withdraw stake (if still open)
   */
  leave(matchId: bigint): Promise<Hash>
  
  /**
   * Get match details
   */
  get(matchId: bigint): Promise<Match>
  
  /**
   * Get active matches (paginated)
   */
  getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]>
  
  /**
   * Get the total count of active matches
   */
  getActiveMatchCount(): Promise<bigint>
  
  /**
   * Get the maximum number of active matches allowed
   */
  getMaxActiveMatches(): Promise<bigint>
  
  /**
   * Get fee configuration (recipients, shares, totalShare)
   */
  getFeeConfiguration(): Promise<{
    recipients: readonly Address[]
    shares: readonly bigint[]
    totalShare: bigint
  }>
  
  /**
   * Get player's stake in a match
   */
  getPlayerStake(matchId: bigint, player: Address): Promise<bigint>
  
  /**
   * Get the address of the scoreboard configured in this contract
   */
  getScoreboardAddress(): Promise<Address>
  
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
}

/**
 * Server-only match operations (requires controller wallet)
 * These operations should only be called from API routes using createServerOharaAi()
 */
export interface ServerMatchOperations extends MatchOperations {
  /**
   * Activate an open match (controller only - server-side only)
   */
  activate(matchId: bigint): Promise<Hash>
  
  /**
   * Finalize an active match with a winner (controller only - server-side only)
   */
  finalize(matchId: bigint, winner: Address): Promise<Hash>
}

/**
 * Create client-side Match operations (excludes server-only operations)
 * This should be used in client components and providers
 */
export function createClientMatchOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient
): MatchOperations {
  return createOperationsInternal(contractAddress, publicClient, walletClient, false) as MatchOperations
}

/**
 * Create Match operations for a specific GameMatch contract
 * For server-side (controller wallet): returns ServerMatchOperations
 */
// Overload: without wallet client, returns base operations
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined
): MatchOperations

// Overload: with wallet client, returns server operations (includes activate/finalize)
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient: WalletClient
): ServerMatchOperations

// Implementation
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient
): MatchOperations | ServerMatchOperations {
  return createOperationsInternal(contractAddress, publicClient, walletClient, true)
}

/**
 * Internal function to create match operations
 */
function createOperationsInternal(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  includeServerOps: boolean = true
): MatchOperations | ServerMatchOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for match operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  const baseOperations: MatchOperations = {
    async create(config: MatchConfig) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      // Calculate value to send (stake amount for native tokens)
      const value = config.token === '0x0000000000000000000000000000000000000000' 
        ? config.stakeAmount 
        : 0n

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'create',
        args: [config.token, config.stakeAmount, BigInt(config.maxPlayers)],
        value,
        account,
        chain: undefined,
      })
    },

    async join(matchId: bigint) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      // Get match details to determine value
      const match = await this.get(matchId)
      const value = match.token === '0x0000000000000000000000000000000000000000'
        ? match.stakeAmount
        : 0n

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'join',
        args: [matchId],
        value,
        account,
        chain: undefined,
      })
    },

    async leave(matchId: bigint) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'leave',
        args: [matchId],
        account,
        chain: undefined,
      })
    },

    async get(matchId: bigint) {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'getMatch',
        args: [matchId],
      })

      const stakeAmount = result[1]
      const players = result[3]
      const totalPrize = stakeAmount * BigInt(players.length)

      return {
        id: matchId,
        token: result[0],
        stakeAmount,
        maxPlayers: Number(result[2]),
        players,
        status: result[4],
        winner: result[5],
        createdAt: result[6],
        totalPrize,
      }
    },

    async getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]> {
      // If no limit specified, fetch all active matches
      if (limit === undefined) {
        const count = await this.getActiveMatchCount()
        limit = Number(count)
      }
      
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'getActiveMatchIds',
        args: [BigInt(offset ?? 0), BigInt(limit)],
      })
    },

    async getActiveMatchCount(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'getActiveMatchCount',
      })
    },

    async getMaxActiveMatches(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'maxActiveMatches',
      })
    },

    async getFeeConfiguration() {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'getFeeConfiguration',
      })

      return {
        recipients: result[0],
        shares: result[1],
        totalShare: result[2],
      }
    },

    async getPlayerStake(matchId: bigint, player: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'getPlayerStake',
        args: [matchId, player],
      })
    },

    async getScoreboardAddress(): Promise<Address> {
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'score',
      })
    },

    async withdrawFees(token: Address): Promise<Hash> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'withdrawFees',
        args: [token],
        account,
        chain: undefined,
      })
    },

    async getPendingFees(recipient: Address, token: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'pendingFees',
        args: [recipient, token],
      })
    },
  }

  // If no wallet client provided or client-only mode, return base operations only
  if (!walletClient || !includeServerOps) {
    return baseOperations
  }

  // Server operations include activate and finalize (controller wallet only)
  const serverOperations: ServerMatchOperations = {
    ...baseOperations,

    async activate(matchId: bigint) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'activate',
        args: [matchId],
        account,
        chain: undefined,
      })
    },

    async finalize(matchId: bigint, winner: Address) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: MATCH_ABI,
        functionName: 'finalize',
        args: [matchId, winner],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
