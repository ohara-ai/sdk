import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { GAME_MATCH_ABI } from '../abis/gameMatch'

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
}

export enum MatchStatus {
  Open = 0,
  Active = 1,
  Finalized = 2,
}

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
   * Withdraw stake from a match (if still open)
   */
  withdraw(matchId: bigint): Promise<Hash>
  
  /**
   * Get match details
   */
  get(matchId: bigint): Promise<Match>
  
  /**
   * Get active matches (paginated)
   */
  getActiveMatches(offset?: number, limit?: number): Promise<readonly bigint[]>
  
  /**
   * Get player's stake in a match
   */
  getPlayerStake(matchId: bigint, player: Address): Promise<bigint>
}

/**
 * Create Match operations for a specific GameMatch contract
 */
export function createMatchOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient
): MatchOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for match operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  return {
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
        abi: GAME_MATCH_ABI,
        functionName: 'createMatch',
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
        abi: GAME_MATCH_ABI,
        functionName: 'joinMatch',
        args: [matchId],
        value,
        account,
        chain: undefined,
      })
    },

    async withdraw(matchId: bigint) {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'withdrawStake',
        args: [matchId],
        account,
        chain: undefined,
      })
    },

    async get(matchId: bigint) {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'getMatch',
        args: [matchId],
      })

      return {
        id: matchId,
        token: result[0],
        stakeAmount: result[1],
        maxPlayers: Number(result[2]),
        players: result[3],
        status: result[4],
        winner: result[5],
        createdAt: result[6],
      }
    },

    async getActiveMatches(offset = 0, limit = 10): Promise<readonly bigint[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'getActiveMatchIds',
        args: [BigInt(offset), BigInt(limit)],
      })
    },

    async getPlayerStake(matchId: bigint, player: Address) {
      return publicClient.readContract({
        address: contractAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'getPlayerStake',
        args: [matchId, player],
      })
    },
  }
}
