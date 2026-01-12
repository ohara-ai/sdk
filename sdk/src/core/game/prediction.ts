import { Address, Hash, PublicClient, WalletClient, keccak256, encodePacked } from 'viem'
import { PREDICTION_ABI } from '../../abis/game/prediction'
import { OharaApiClient } from '../../server/oharaApiClient'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Competition type for prediction markets
 */
export enum CompetitionType {
  Match = 0,
  Tournament = 1,
  LeagueCycle = 2,
}

/**
 * Market data structure
 */
export interface Market {
  competitionType: CompetitionType
  competitionId: bigint
  token: Address
  totalPool: bigint
  bettingClosed: boolean
  resolved: boolean
  voided: boolean
  resolvedWinner: Address
}

/**
 * Individual prediction data
 */
export interface Prediction {
  predictedPlayer: Address
  amount: bigint
  claimed: boolean
}

/**
 * Player odds data
 */
export interface PlayerOdds {
  player: Address
  totalStaked: bigint
  odds: bigint
}

/**
 * Commit data for commit-reveal scheme
 */
export interface CommitData {
  commitHash: Hash
  amount: bigint
  commitTime: bigint
  revealed: boolean
}

/**
 * Market summary for UI display
 */
export interface MarketSummary {
  competitionType: CompetitionType
  competitionId: bigint
  totalPool: bigint
  predictorCount: bigint
  uniquePlayersCount: bigint
  bettingOpen: boolean
  resolved: boolean
  resolvedWinner: Address
}

// =============================================================================
// OPERATIONS INTERFACE
// =============================================================================

/**
 * Read-only prediction operations
 */
export interface PredictionOperations {
  /** Get market data */
  getMarket(marketId: bigint): Promise<Market>
  
  /** Get market summary for UI */
  getMarketSummary(marketId: bigint): Promise<MarketSummary>
  
  /** Check if betting is open for a market */
  isBettingOpen(marketId: bigint): Promise<boolean>
  
  /** Get a user's prediction */
  getPrediction(marketId: bigint, predictor: Address): Promise<Prediction>
  
  /** Get total staked on a player */
  getStakeForPlayer(marketId: bigint, player: Address): Promise<bigint>
  
  /** Get odds for a specific player (in basis points, 10000 = 1x) */
  getOddsForPlayer(marketId: bigint, player: Address): Promise<bigint>
  
  /** Get odds for all predicted players */
  getAllOdds(marketId: bigint): Promise<PlayerOdds[]>
  
  /** Get all players that have been predicted */
  getPredictedPlayers(marketId: bigint): Promise<Address[]>
  
  /** Get all predictors for a market */
  getPredictors(marketId: bigint): Promise<Address[]>
  
  /** Get commit data for a predictor */
  getCommit(marketId: bigint, predictor: Address): Promise<CommitData>
  
  /** Check if a prediction was correct (after resolution) */
  isPredictionCorrect(marketId: bigint, predictor: Address): Promise<boolean>
  
  /** Calculate potential payout for a prediction */
  getPotentialPayout(marketId: bigint, predictor: Address): Promise<bigint>
  
  /** Get the next market ID */
  getNextMarketId(): Promise<bigint>
  
  /** Generate commit hash for commit-reveal betting */
  generateCommitHash(predictedPlayer: Address, salt: Hash): Hash
}

/**
 * Write operations for prediction (requires wallet)
 */
export interface PredictionWriteOperations extends PredictionOperations {
  /** Place a direct prediction (native token) */
  predict(marketId: bigint, predictedPlayer: Address, amount: bigint): Promise<Hash>
  
  /** Commit a prediction (phase 1 of commit-reveal) */
  commit(marketId: bigint, commitHash: Hash, amount: bigint): Promise<Hash>
  
  /** Reveal a committed prediction (phase 2 of commit-reveal) */
  reveal(marketId: bigint, predictedPlayer: Address, salt: Hash): Promise<Hash>
  
  /** Claim winnings from a resolved market */
  claim(marketId: bigint): Promise<Hash>
  
  /** Claim refund for unrevealed commits or failed predictions */
  claimRefund(marketId: bigint): Promise<Hash>
  
  /** Resolve a market after competition ends */
  resolve(marketId: bigint): Promise<Hash>
}

/**
 * Server operations for prediction (includes controller-only functions)
 */
export interface ServerPredictionOperations extends PredictionWriteOperations {
  /** Create a new prediction market (controller only) */
  createMarket(
    competitionType: CompetitionType,
    competitionId: bigint,
    token: Address,
  ): Promise<Hash>
  
  /** Close betting for a market (controller only) */
  closeBetting(marketId: bigint): Promise<Hash>
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create client-side Prediction operations (for React providers)
 * Read-only operations with optional write operations if wallet client provided
 */
export function createClientPredictionOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
): PredictionOperations | PredictionWriteOperations {
  return createOperations(contractAddress, publicClient, walletClient)
}

/**
 * Create Prediction operations for a specific Prediction contract
 * Without wallet client, returns read-only operations
 */
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined,
  oharaApiClient?: undefined,
  chainId?: undefined,
): PredictionOperations

/**
 * Create Prediction operations with wallet client
 * Returns full write operations including server operations if API client provided
 */
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ServerPredictionOperations

/**
 * Implementation
 */
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): PredictionOperations | ServerPredictionOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for prediction operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  const baseOperations: PredictionOperations = {
    async getMarket(marketId: bigint): Promise<Market> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getMarket',
        args: [marketId],
      })

      return {
        competitionType: result.competitionType as CompetitionType,
        competitionId: result.competitionId,
        token: result.token,
        totalPool: result.totalPool,
        bettingClosed: result.bettingClosed,
        resolved: result.resolved,
        voided: result.voided,
        resolvedWinner: result.resolvedWinner,
      }
    },

    async getMarketSummary(marketId: bigint): Promise<MarketSummary> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getMarketSummary',
        args: [marketId],
      })

      return {
        competitionType: result[0] as CompetitionType,
        competitionId: result[1],
        totalPool: result[2],
        predictorCount: result[3],
        uniquePlayersCount: result[4],
        bettingOpen: result[5],
        resolved: result[6],
        resolvedWinner: result[7],
      }
    },

    async isBettingOpen(marketId: bigint): Promise<boolean> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'isBettingOpen',
        args: [marketId],
      })
    },

    async getPrediction(marketId: bigint, predictor: Address): Promise<Prediction> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getPrediction',
        args: [marketId, predictor],
      })

      return {
        predictedPlayer: result.predictedPlayer,
        amount: result.amount,
        claimed: result.claimed,
      }
    },

    async getStakeForPlayer(marketId: bigint, player: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getStakeForPlayer',
        args: [marketId, player],
      })
    },

    async getOddsForPlayer(marketId: bigint, player: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getOddsForPlayer',
        args: [marketId, player],
      })
    },

    async getAllOdds(marketId: bigint): Promise<PlayerOdds[]> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getAllOdds',
        args: [marketId],
      })

      return result.map((odds) => ({
        player: odds.player,
        totalStaked: odds.totalStaked,
        odds: odds.odds,
      }))
    },

    async getPredictedPlayers(marketId: bigint): Promise<Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getPredictedPlayers',
        args: [marketId],
      }) as Promise<Address[]>
    },

    async getPredictors(marketId: bigint): Promise<Address[]> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getPredictors',
        args: [marketId],
      }) as Promise<Address[]>
    },

    async getCommit(marketId: bigint, predictor: Address): Promise<CommitData> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getCommit',
        args: [marketId, predictor],
      })

      return {
        commitHash: result[0],
        amount: result[1],
        commitTime: result[2],
        revealed: result[3],
      }
    },

    async isPredictionCorrect(marketId: bigint, predictor: Address): Promise<boolean> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'isPredictionCorrect',
        args: [marketId, predictor],
      })
    },

    async getPotentialPayout(marketId: bigint, predictor: Address): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'getPotentialPayout',
        args: [marketId, predictor],
      })
    },

    async getNextMarketId(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'nextMarketId',
      })
    },

    generateCommitHash(predictedPlayer: Address, salt: Hash): Hash {
      return keccak256(encodePacked(['address', 'bytes32'], [predictedPlayer, salt]))
    },
  }

  // If no wallet client provided, return read-only operations
  if (!walletClient) {
    return baseOperations
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  const writeOperations: PredictionWriteOperations = {
    ...baseOperations,

    async predict(marketId: bigint, predictedPlayer: Address, amount: bigint): Promise<Hash> {
      // Payable functions require direct wallet interaction
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'predict',
        args: [marketId, predictedPlayer, 0n],
        value: amount,
        account,
        chain: undefined,
      })
    },

    async commit(marketId: bigint, commitHash: Hash, amount: bigint): Promise<Hash> {
      // Payable functions require direct wallet interaction
      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'commit',
        args: [marketId, commitHash, 0n],
        value: amount,
        account,
        chain: undefined,
      })
    },

    async reveal(marketId: bigint, predictedPlayer: Address, salt: Hash): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'reveal',
          params: {
            marketId: marketId.toString(),
            predictedPlayer,
            salt,
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'reveal',
        args: [marketId, predictedPlayer, salt],
        account,
        chain: undefined,
      })
    },

    async claim(marketId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'claim',
          params: {
            marketId: marketId.toString(),
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'claim',
        args: [marketId],
        account,
        chain: undefined,
      })
    },

    async claimRefund(marketId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'claimRefund',
          params: {
            marketId: marketId.toString(),
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'claimRefund',
        args: [marketId],
        account,
        chain: undefined,
      })
    },

    async resolve(marketId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'resolve',
          params: {
            marketId: marketId.toString(),
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'resolve',
        args: [marketId],
        account,
        chain: undefined,
      })
    },
  }

  // ==========================================================================
  // SERVER OPERATIONS (Controller-only functions)
  // ==========================================================================

  const serverOperations: ServerPredictionOperations = {
    ...writeOperations,

    async createMarket(
      competitionType: CompetitionType,
      competitionId: bigint,
      token: Address,
    ): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'createMarket',
          params: {
            competitionType: competitionType.toString(),
            competitionId: competitionId.toString(),
            token,
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'createMarket',
        args: [competitionType, competitionId, token],
        account,
        chain: undefined,
      })
    },

    async closeBetting(marketId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'closeBetting',
          params: {
            marketId: marketId.toString(),
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)
        if (status.status === 'FAILED') {
          throw new Error(`Transaction failed: ${status.errorMessage || 'Unknown error'}`)
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: PREDICTION_ABI,
        functionName: 'closeBetting',
        args: [marketId],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
