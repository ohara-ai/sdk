import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { PRIZE_ABI } from '../../abis/game/prize'

export interface PrizePool {
  matchesCompleted: bigint
  winner: Address
  highestWins: bigint
  finalized: boolean
  prizeClaimed: boolean
}

export interface PrizeOperations {
  getCurrentPoolId(): Promise<bigint>
  getMatchesPerPool(): Promise<bigint>
  getPool(poolId: bigint): Promise<PrizePool>
  getPoolWins(poolId: bigint, player: Address): Promise<bigint>
  getTokens(): Promise<readonly Address[]>
  getPoolPrize(poolId: bigint, token: Address): Promise<bigint>
  getClaimablePools(player: Address): Promise<readonly bigint[]>
  claimPrize(poolId: bigint): Promise<Hash>
}

export function createClientPrizeOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
): PrizeOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for prize operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  return {
    async getCurrentPoolId(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getCurrentPoolId',
      })
    },

    async getMatchesPerPool(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getMatchesPerPool',
      })
    },

    async getPool(poolId: bigint): Promise<PrizePool> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPool',
        args: [poolId],
      })

      return {
        matchesCompleted: result[0],
        winner: result[1],
        highestWins: result[2],
        finalized: result[3],
        prizeClaimed: result[4],
      }
    },

    async getPoolWins(poolId: bigint, player: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPoolWins',
        args: [poolId, player],
      })
    },

    async getTokens(): Promise<readonly Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getTokens',
      })
    },

    async getPoolPrize(poolId: bigint, token: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPoolPrize',
        args: [poolId, token],
      })
    },

    async getClaimablePools(player: Address): Promise<readonly bigint[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getClaimablePools',
        args: [player],
      })
    },

    async claimPrize(poolId: bigint): Promise<Hash> {
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'claimPrize',
        args: [poolId],
        account,
        chain: undefined,
      })
    },
  }
}
