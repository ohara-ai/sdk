import { Address } from 'viem'
import path from 'path'

/**
 * Ohara SDK Configuration
 * Centralizes all environment variable handling and mode detection
 */
export interface OharaConfig {
  /** RPC URL for blockchain network */
  rpcUrl: string

  /** Chain ID for blockchain network */
  sdkChainId: number

  /** Factory contract addresses */
  factories: {
    gameMatch?: Address
    gameScore?: Address
    gamePrize?: Address
    eventBus?: Address
    league?: Address
    tournament?: Address
    prediction?: Address
  }

  /** Public token/coin addresses */
  publicAddresses: {
    token?: Address
    coin?: Address
  }

  /** Ohara API configuration (when using API mode) */
  api?: {
    url: string
    token: string
  }

  /** Key encryption secret (optional) */
  keyEncryptionSecret?: string

  /** Computed: whether API mode is enabled */
  isApiMode: boolean
}

/**
 * Load configuration from environment variables
 * Performs validation and computes derived values
 * 
 * @throws {Error} If required configuration is missing
 */
export function loadConfig(): OharaConfig {
  if (!process.env.RPC_URL) {
    console.warn('RPC_URL is not set, defaulting to http://localhost:8545')
  }

  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
  const sdkChainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID as unknown as number

  // Factory addresses (optional)
  const gameMatchFactory = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as Address | undefined
  const gameScoreFactory = process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY as Address | undefined
  const gamePrizeFactory = process.env.NEXT_PUBLIC_GAME_PRIZE_FACTORY as Address | undefined
  const eventBusFactory = process.env.NEXT_PUBLIC_EVENT_BUS_FACTORY as Address | undefined
  const leagueFactory = process.env.NEXT_PUBLIC_LEAGUE_FACTORY as Address | undefined
  const tournamentFactory = process.env.NEXT_PUBLIC_TOURNAMENT_FACTORY as Address | undefined
  const predictionFactory = process.env.NEXT_PUBLIC_PREDICTION_FACTORY as Address | undefined

  // Public addresses (optional)
  const token = process.env.NEXT_PUBLIC_HELLOWORLD_TOKEN as Address | undefined
  const coin = process.env.NEXT_PUBLIC_APP_COIN as Address | undefined

  // API configuration (optional, but both must be present for API mode)
  const apiUrl = process.env.OHARA_API_URL
  const apiToken = process.env.OHARA_CONTROLLER_TOKEN
  const isApiMode = !!(apiUrl && apiToken)

  // Key encryption (optional)
  const keyEncryptionSecret = process.env.OHARA_KEY_ENCRYPTION_SECRET

  return {
    rpcUrl,
    sdkChainId,
    factories: {
      gameMatch: gameMatchFactory,
      gameScore: gameScoreFactory,
      gamePrize: gamePrizeFactory,
      eventBus: eventBusFactory,
      league: leagueFactory,
      tournament: tournamentFactory,
      prediction: predictionFactory,
    },
    publicAddresses: {
      token,
      coin,
    },
    api: isApiMode && apiUrl && apiToken
      ? { url: apiUrl, token: apiToken }
      : undefined,
    keyEncryptionSecret,
    isApiMode,
  }
}

/**
 * Get the current configuration
 * Always reads fresh from environment variables to avoid timing issues
 * where config is cached before env vars are loaded
 */
export function getConfig(): OharaConfig {
  return loadConfig()
}

/**
 * Check if API mode is enabled
 * Convenience function for common check
 */
export function isApiMode(): boolean {
  return getConfig().isApiMode
}

/**
 * Get the preferred SDK chain ID
 * Safe to call from both client and server code
 * 
 * In client-side code, this attempts to read from the consuming app's
 * environment at runtime to avoid bundling issues with library packages.
 * 
 * @returns The preferred chain ID, or undefined if not set
 */
export function getPreferredChainId(): number | undefined {
  // In browser, try to read from the consuming app's process.env at runtime
  // This works because the consuming Next.js app will have bundled these values
  if (typeof window !== 'undefined') {
    // Try to access via process.env (will be defined by consuming app's webpack config)
    try {
      const envValue = process.env.NEXT_PUBLIC_SDK_CHAIN_ID as string | undefined
      return envValue ? Number(envValue) : undefined
    } catch (e) {
      console.warn('[oharaConfig] Failed to read NEXT_PUBLIC_SDK_CHAIN_ID:', e)
      return undefined
    }
  }
  
  // Server-side: read directly
  const chainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID
  return chainId ? Number(chainId) : undefined
}

/**
 * Get the storage directory path for local data
 * Centralized configuration for where the SDK stores local data
 * 
 * Files are stored in public/ohara-ai-data for easy access.
 * For Vercel serverless, apps must include this folder via outputFileTracingIncludes
 * in next.config.js to make it available to API routes.
 * 
 * Custom path via OHARA_STORAGE_DIR env var takes highest priority.
 * 
 * @returns Absolute path to the storage directory
 */
export function getStorageDir(): string {
  // Allow explicit override via environment variable
  if (process.env.OHARA_STORAGE_DIR) {
    return process.env.OHARA_STORAGE_DIR
  }

  // Default: public/ohara-ai-data (works for local dev and Vercel with outputFileTracingIncludes)
  return path.join(process.cwd(), 'public', 'ohara-ai-data')
}

/**
 * Get specific storage file paths
 */
export const storagePaths = {
  keys: () => path.join(getStorageDir(), 'keys.json'),
  contracts: () => path.join(getStorageDir(), 'contracts.json'),
  apiCache: () => path.join(getStorageDir(), 'api-cache.json'),
  requirements: () => path.join(getStorageDir(), 'requirements.json'),
}
