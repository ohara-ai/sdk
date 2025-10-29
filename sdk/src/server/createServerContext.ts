import { createPublicClient, createWalletClient, http, PublicClient, WalletClient, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createMatchOperations } from '../core/game/match'
import { createScoreOperations } from '../core/game/scores'
import { getContracts, getControllerKey, getControllerAddress } from '../storage/contractStorage'
import type { ServerGameContext, AppContext, OharaContext, InternalContext } from '../context/OharaAiContext'

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
}

let cachedContext: ServerOharaAiContext | null = null

/**
 * Create server-side OharaAi context (same as client-side provider)
 * Automatically loads contract addresses from storage
 */
export async function createServerOharaAi(chainId?: number): Promise<ServerOharaAiContext> {
  const targetChainId = chainId || (await getChainIdFromRPC())
  
  // Return cached context if same chain
  if (cachedContext && cachedContext.internal.chainId === targetChainId) {
    return cachedContext
  }
  
  // Create clients
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
  
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  })
  
  // Create wallet client using controller private key from storage
  let walletClient: WalletClient | undefined
  try {
    const appControllerPrivateKey = await getControllerKey()
    if (appControllerPrivateKey) {
      const account = privateKeyToAccount(appControllerPrivateKey as `0x${string}`)
      walletClient = createWalletClient({
        account,
        transport: http(rpcUrl),
      })
    }
  } catch (error) {
    console.error('Failed to load controller private key from storage:', error)
  }
  
  // Get contract addresses from storage (same as client-side provider)
  const addresses = await getContracts(targetChainId)
  
  // Build hierarchical context structure
  const ohara: OharaContext = {
    contracts: {
      token: process.env.NEXT_PUBLIC_HELLOWORLD_TOKEN as Address | undefined,
    },
  }
  
  // Server game context with controller wallet operations
  const game: ServerGameContext = {
    match: {
      address: addresses.game?.match as Address | undefined,
      // When walletClient is provided, createMatchOperations returns ServerMatchOperations
      operations: addresses.game?.match && walletClient
        ? createMatchOperations(addresses.game.match as Address, publicClient, walletClient)
        : undefined,
    },
    scores: {
      address: addresses.game?.score as Address | undefined,
      operations: addresses.game?.score
        ? createScoreOperations(addresses.game.score as Address, publicClient)
        : undefined,
    },
  }
  
  // Get controller address from storage (derived from private key)
  let controllerAddress: Address | undefined
  try {
    controllerAddress = await getControllerAddress()
  } catch (error) {
    console.error('Failed to derive controller address from storage:', error)
  }
  
  const app: AppContext = {
    coin: {
      address: process.env.NEXT_PUBLIC_APP_COIN as Address | undefined,
    },
    controller: {
      address: controllerAddress,
    },
  }
  
  const internal: InternalContext = {
    chainId: targetChainId,
    factories: {
      gameMatch: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as Address | undefined,
      gameScore: process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY as Address | undefined,
    },
  }
  
  cachedContext = {
    ohara,
    game,
    app,
    internal,
    publicClient,
    walletClient,
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
