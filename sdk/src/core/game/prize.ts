import { PublicClient, WalletClient, Address, Hash } from 'viem'
import { PRIZE_ABI } from '../../abis/game/prize'

export interface PrizePool {
  token: Address
  matchesCompleted: bigint
  finalized: boolean
  prizeAmount: bigint
}

export interface PrizePoolWinners {
  winners: readonly Address[]
  winCounts: readonly bigint[]
  claimed: readonly boolean[]
}

export enum DistributionStrategy {
  Equal = 0,
  Linear = 1,
  Exponential = 2,
  WinnerTakeAll = 3,
  ProportionalToWins = 4,
}

export interface PrizeOperations {
  getCurrentPoolId(token: Address): Promise<bigint>
  getMatchesPerPool(): Promise<bigint>
  getWinnersCount(): Promise<bigint>
  getDistributionStrategy(): Promise<DistributionStrategy>
  getPool(poolId: bigint): Promise<PrizePool>
  getPoolWinners(poolId: bigint): Promise<PrizePoolWinners>
  getPoolWins(poolId: bigint, player: Address): Promise<bigint>
  getPrizeForRank(poolId: bigint, rank: bigint): Promise<bigint>
  getTokens(): Promise<readonly Address[]>
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
    async getCurrentPoolId(token: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getCurrentPoolId',
        args: [token],
      })
    },

    async getMatchesPerPool(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getMatchesPerPool',
      })
    },

    async getWinnersCount(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getWinnersCount',
      })
    },

    async getDistributionStrategy(): Promise<DistributionStrategy> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getDistributionStrategy',
      })
      return result as DistributionStrategy
    },

    async getPool(poolId: bigint): Promise<PrizePool> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPool',
        args: [poolId],
      })

      return {
        token: result[0],
        matchesCompleted: result[1],
        finalized: result[2],
        prizeAmount: result[3],
      }
    },

    async getPoolWinners(poolId: bigint): Promise<PrizePoolWinners> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPoolWinners',
        args: [poolId],
      })

      return {
        winners: result[0],
        winCounts: result[1],
        claimed: result[2],
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

    async getPrizeForRank(poolId: bigint, rank: bigint): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getPrizeForRank',
        args: [poolId, rank],
      })
    },

    async getTokens(): Promise<readonly Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PRIZE_ABI,
        functionName: 'getTokens',
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
