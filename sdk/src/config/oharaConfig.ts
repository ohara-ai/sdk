import { Address } from 'viem'
import { ConfigError } from '../errors'

/**
 * Ohara SDK Configuration
 * Centralizes all environment variable handling and mode detection
 */
export interface OharaConfig {
  /** RPC URL for blockchain network */
  rpcUrl: string

  /** Factory contract addresses */
  factories: {
    gameMatch?: Address
    gameScore?: Address
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
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

  // Factory addresses (optional)
  const gameMatchFactory = process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY as Address | undefined
  const gameScoreFactory = process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY as Address | undefined

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
    factories: {
      gameMatch: gameMatchFactory,
      gameScore: gameScoreFactory,
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
 * Cached config instance (loaded once per process)
 */
let cachedConfig: OharaConfig | null = null

/**
 * Get the current configuration (cached)
 * Loads from environment on first call
 */
export function getConfig(): OharaConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}

/**
 * Clear the cached configuration
 * Useful for testing or when environment changes
 */
export function clearConfigCache(): void {
  cachedConfig = null
}

/**
 * Check if API mode is enabled
 * Convenience function for common check
 */
export function isApiMode(): boolean {
  return getConfig().isApiMode
}
