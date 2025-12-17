import {
  createPublicClient,
  createWalletClient,
  http,
} from 'viem'
import type {
  PublicClient,
  WalletClient,
  Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createOperations } from '../core/game/match'
import { createClientScoreOperations } from '../core/game/scores'
import { createClientPrizeOperations } from '../core/game/prize'
import {
  getContracts,
  getControllerKey,
  getControllerAddress,
} from '../storage/contractStorage'
import type {
  ServerGameContext,
  AppContext,
  OharaContext,
  InternalContext,
} from '../context/OharaAiContext'
import { OharaApiClient, getOharaApiClient } from './oharaApiClient'
import { getConfig, getPreferredChainId } from '../config/oharaConfig'
import { ConfigError } from '../errors'

/**
 * Server-side OharaAi Context
 * Creates SDK operations on the server using the same pattern as client-side OharaAiProvider
 *
 * Usage in API routes:
 * ```typescript
 * const { game, ohara, app } = await createServerOharaAi()
 * const match = await game.match.operations?.get(matchId)
 * ```
 */

export interface ServerOharaAiContext {
  /** Ohara-managed contracts */
  ohara: OharaContext

  /** Game contracts and operations (with server-only operations) */
  game: ServerGameContext

  /** Application contracts */
  app: AppContext

  /** Internal configuration */
  internal: InternalContext

  /** Direct access to clients */
  publicClient: PublicClient
  walletClient?: WalletClient

  /** Ohara API client (only available when OHARA_CONTROLLER_TOKEN is set) */
  oharaApiClient?: OharaApiClient

  /** Whether the SDK is operating in Ohara API mode */
  isApiMode: boolean
}

let cachedContext: ServerOharaAiContext | null = null

/**
 * Create server-side OharaAi context (same as client-side provider)
 * Automatically loads contract addresses from storage
 *
 * Supports two modes:
 * 1. Direct on-chain mode: Uses controller private key from storage
 * 2. Ohara API mode: Uses OHARA_CONTROLLER_TOKEN and OHARA_API_URL
 * 
 * @param chainId - Optional chain ID (defaults to NEXT_PUBLIC_SDK_CHAIN_ID, then RPC)
 */
export async function createServerOharaAi(
  chainId?: number,
): Promise<ServerOharaAiContext> {
  const config = getConfig()
  // Priority: provided chainId > config chainId > RPC chainId
  const targetChainId = chainId ?? getPreferredChainId() ?? (await getChainIdFromRPC())
  if (targetChainId === undefined) {
    throw new ConfigError(
      'No chainId provided and NEXT_PUBLIC_SDK_CHAIN_ID is not configured',
    )
  }

  // Return cached context if same chain
  if (cachedContext && cachedContext.app.chainId === targetChainId) {
    return cachedContext
  }

  // Check if we're in API mode
  const isApiMode = config.isApiMode
  let oharaApiClient: OharaApiClient | undefined

  if (isApiMode) {
    oharaApiClient = getOharaApiClient()
    console.log('Ohara API client configured:', oharaApiClient)
  }

  // Create clients
  const rpcUrl = config.rpcUrl

  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  })

  // Create wallet client using controller private key from storage
  // Only needed in direct on-chain mode
  let walletClient: WalletClient | undefined
  if (!isApiMode) {
    try {
      const appControllerPrivateKey = await getControllerKey()
      if (appControllerPrivateKey) {
        const account = privateKeyToAccount(
          appControllerPrivateKey as `0x${string}`,
        )
        walletClient = createWalletClient({
          account,
          transport: http(rpcUrl),
        })
      }
    } catch (error) {
      console.error(
        'Failed to load controller private key from storage:',
        error,
      )
    }
  }

  // Get contract addresses from storage (same as client-side provider)
  const addresses = await getContracts(targetChainId)

  // Build hierarchical context structure
  const ohara: OharaContext = {
    contracts: {
      token: config.publicAddresses.token,
    },
  }

  // Server game context with controller wallet operations
  const game: ServerGameContext = {
    match: {
      address: addresses.game?.match as Address | undefined,
      // When walletClient is provided, createOperations returns ServerMatchOperations
      // In API mode, we still create operations but they'll use the API internally
      operations:
        addresses.game?.match && (walletClient || isApiMode)
          ? createOperations(
              addresses.game.match as Address,
              publicClient,
              walletClient,
              isApiMode ? oharaApiClient : undefined,
              targetChainId,
            )
          : undefined,
    },
    scores: {
      address: addresses.game?.score as Address | undefined,
      operations: addresses.game?.score
        ? createClientScoreOperations(
            addresses.game.score as Address,
            publicClient,
          )
        : undefined,
    },
    prize: {
      address: addresses.game?.prize as Address | undefined,
      operations: addresses.game?.prize
        ? createClientPrizeOperations(
            addresses.game.prize as Address,
            publicClient,
            walletClient,
          )
        : undefined,
    },
  }

  // Get controller address (automatically handles both API mode and direct mode)
  const controllerAddress = await getControllerAddress()

  const app: AppContext = {
    coin: {
      address: config.publicAddresses.coin,
    },
    controller: {
      address: controllerAddress,
    },
    chainId: targetChainId,
  }

  const internal: InternalContext = {
    factories: {
      gameMatch: config.factories.gameMatch,
      gameScore: config.factories.gameScore,
      gamePrize: config.factories.gamePrize,
    },
  }

  cachedContext = {
    ohara,
    game,
    app,
    internal,
    publicClient,
    walletClient,
    oharaApiClient,
    isApiMode,
  }

  return cachedContext
}

/**
 * Get chain ID from RPC
 */
async function getChainIdFromRPC(): Promise<number> {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
  const client = createPublicClient({
    transport: http(rpcUrl),
  })
  return await client.getChainId()
}

/**
 * Clear cached context (useful after contract redeployment)
 */
export function clearOharaAiCache() {
  cachedContext = null
}
