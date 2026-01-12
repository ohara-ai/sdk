import type { Address, Hash, PublicClient, WalletClient } from 'viem'
import { TOURNAMENT_ABI } from '../../abis/game/tournament'
import type { OharaApiClient } from '../../server/oharaApiClient'

/**
 * Tournament status enum matching the Solidity contract
 */
export enum TournamentStatus {
  Pending = 0,
  Active = 1,
  Finalized = 2,
  Cancelled = 3,
}

/**
 * Tournament view data structure
 */
export interface TournamentView {
  participantCount: bigint
  currentRound: bigint
  totalRounds: bigint
  status: TournamentStatus
  winner: Address
  createdAt: bigint
}

/**
 * Bracket match data structure
 */
export interface BracketMatch {
  player1: Address
  player2: Address
  winner: Address
  resolved: boolean
}

/**
 * Pending match check result
 */
export interface PendingMatchResult {
  exists: boolean
  round: bigint
  matchIndex: bigint
}

/**
 * Client-side tournament operations (safe for user wallet)
 * Read-only operations for querying tournament state
 */
export interface TournamentOperations {
  /**
   * Get tournament details
   */
  getTournament(tournamentId: bigint): Promise<TournamentView>

  /**
   * Get participants in a tournament
   */
  getParticipants(tournamentId: bigint): Promise<Address[]>

  /**
   * Get a specific bracket match
   */
  getBracketMatch(
    tournamentId: bigint,
    round: bigint,
    matchIndex: bigint,
  ): Promise<BracketMatch>

  /**
   * Get all matches for a round
   */
  getRoundMatches(tournamentId: bigint, round: bigint): Promise<BracketMatch[]>

  /**
   * Check if a tournament has a pending match for given players
   */
  hasPendingMatch(
    tournamentId: bigint,
    player1: Address,
    player2: Address,
  ): Promise<PendingMatchResult>

  /**
   * Get total number of active tournaments
   */
  getActiveTournamentCount(): Promise<bigint>

  /**
   * Get the score contract address
   */
  getScoreContract(): Promise<Address>

  /**
   * Get max active tournaments limit
   */
  getMaxActiveTournaments(): Promise<bigint>

  /**
   * Get maximum participants per tournament
   */
  getMaxParticipants(): Promise<bigint>
}

/**
 * Server-only tournament operations (requires controller wallet)
 * These operations should only be called from API routes using createServerOharaAi()
 */
export interface ServerTournamentOperations extends TournamentOperations {
  /**
   * Create a new tournament with participants (controller only - server-side only)
   */
  createTournament(participants: Address[]): Promise<{ txHash: Hash; tournamentId?: bigint }>

  /**
   * Activate a pending tournament (controller only - server-side only)
   */
  activate(tournamentId: bigint): Promise<Hash>

  /**
   * Manually resolve a bracket match (controller only - server-side only)
   */
  resolveMatch(
    tournamentId: bigint,
    round: bigint,
    matchIndex: bigint,
    winner: Address,
  ): Promise<Hash>

  /**
   * Cancel a tournament (controller only - server-side only)
   */
  cancel(tournamentId: bigint): Promise<Hash>

  /**
   * Set the score contract address (controller only - server-side only)
   */
  setScoreContract(scoreAddress: Address): Promise<Hash>

  /**
   * Set the prediction contract address (controller only - server-side only)
   */
  setPrediction(predictionAddress: Address): Promise<Hash>
}

/**
 * Create client-side Tournament operations (excludes server-only operations)
 * This should be used in client components and providers
 */
export function createClientTournamentOperations(
  contractAddress: Address,
  publicClient: PublicClient,
): TournamentOperations {
  return createOperationsInternal(
    contractAddress,
    publicClient,
    undefined,
    false,
  ) as TournamentOperations
}

/**
 * Create Tournament operations for a specific Tournament contract
 * For server-side (controller wallet): returns ServerTournamentOperations
 */
export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: undefined,
  oharaApiClient?: undefined,
  chainId?: undefined,
): TournamentOperations

export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): ServerTournamentOperations

export function createOperations(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): TournamentOperations | ServerTournamentOperations {
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
 * Internal function to create tournament operations
 */
function createOperationsInternal(
  contractAddress: Address,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  includeServerOps: boolean = true,
  oharaApiClient?: OharaApiClient,
  chainId?: number,
): TournamentOperations | ServerTournamentOperations {
  if (!publicClient) {
    throw new Error('PublicClient is required for tournament operations')
  }

  const requireWallet = () => {
    if (!walletClient) {
      throw new Error('WalletClient is required for write operations')
    }
    return walletClient
  }

  const baseOperations: TournamentOperations = {
    async getTournament(tournamentId: bigint): Promise<TournamentView> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'getTournament',
        args: [tournamentId],
      })

      return {
        participantCount: result.participantCount,
        currentRound: result.currentRound,
        totalRounds: result.totalRounds,
        status: result.status as TournamentStatus,
        winner: result.winner,
        createdAt: result.createdAt,
      }
    },

    async getParticipants(tournamentId: bigint): Promise<Address[]> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'getParticipants',
        args: [tournamentId],
      })
      return [...result]
    },

    async getBracketMatch(
      tournamentId: bigint,
      round: bigint,
      matchIndex: bigint,
    ): Promise<BracketMatch> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'getBracketMatch',
        args: [tournamentId, round, matchIndex],
      })

      return {
        player1: result.player1,
        player2: result.player2,
        winner: result.winner,
        resolved: result.resolved,
      }
    },

    async getRoundMatches(
      tournamentId: bigint,
      round: bigint,
    ): Promise<BracketMatch[]> {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'getRoundMatches',
        args: [tournamentId, round],
      })

      return result.map((m) => ({
        player1: m.player1,
        player2: m.player2,
        winner: m.winner,
        resolved: m.resolved,
      }))
    },

    async hasPendingMatch(
      tournamentId: bigint,
      player1: Address,
      player2: Address,
    ): Promise<PendingMatchResult> {
      const [exists, round, matchIndex] = await publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'hasPendingMatch',
        args: [tournamentId, player1, player2],
      })

      return { exists, round, matchIndex }
    },

    async getActiveTournamentCount(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'getActiveTournamentCount',
        args: [],
      })
    },

    async getScoreContract(): Promise<Address> {
      return publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'scoreContract',
        args: [],
      })
    },

    async getMaxActiveTournaments(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'maxActiveTournaments',
        args: [],
      })
    },

    async getMaxParticipants(): Promise<bigint> {
      return publicClient.readContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'MAX_PARTICIPANTS',
        args: [],
      })
    },
  }

  if ((!walletClient && !oharaApiClient) || !includeServerOps) {
    return baseOperations
  }

  const serverOperations: ServerTournamentOperations = {
    ...baseOperations,

    async createTournament(
      participants: Address[],
    ): Promise<{ txHash: Hash; tournamentId?: bigint }> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'createTournament',
          params: { participants },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return { txHash: result.data.txHash }
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      const hash = await wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'createTournament',
        args: [participants],
        account,
        chain: undefined,
      })

      return { txHash: hash }
    },

    async activate(tournamentId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'activate',
          params: { id: tournamentId.toString() },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'activate',
        args: [tournamentId],
        account,
        chain: undefined,
      })
    },

    async resolveMatch(
      tournamentId: bigint,
      round: bigint,
      matchIndex: bigint,
      winner: Address,
    ): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'resolveMatch',
          params: {
            id: tournamentId.toString(),
            round: round.toString(),
            matchIndex: matchIndex.toString(),
            winner,
          },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'resolveMatch',
        args: [tournamentId, round, matchIndex, winner],
        account,
        chain: undefined,
      })
    },

    async cancel(tournamentId: bigint): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'cancel',
          params: { id: tournamentId.toString() },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'cancel',
        args: [tournamentId],
        account,
        chain: undefined,
      })
    },

    async setScoreContract(scoreAddress: Address): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setScoreContract',
          params: { _score: scoreAddress },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'setScoreContract',
        args: [scoreAddress],
        account,
        chain: undefined,
      })
    },

    async setPrediction(predictionAddress: Address): Promise<Hash> {
      if (oharaApiClient && chainId) {
        const result = await oharaApiClient.executeContractFunction({
          contractAddress,
          functionName: 'setPrediction',
          params: { _prediction: predictionAddress },
          chainId,
        })

        const status = await oharaApiClient.waitForTransaction(result.data.txHash)

        if (status.status === 'FAILED') {
          throw new Error(
            `Transaction failed: ${status.errorMessage || 'Unknown error'}`,
          )
        }

        return result.data.txHash
      }

      const wallet = requireWallet()
      const account = wallet.account
      if (!account) throw new Error('No account found in wallet')

      return wallet.writeContract({
        address: contractAddress,
        abi: TOURNAMENT_ABI,
        functionName: 'setPrediction',
        args: [predictionAddress],
        account,
        chain: undefined,
      })
    },
  }

  return serverOperations
}
