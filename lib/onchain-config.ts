/**
 * Onchain configuration types and loader
 * Reads from .onchain-cfg.json (generated during build)
 */

export interface OnchainConfig {
  controllerPrivateKey: string  // Server-side only! Never expose to client
  controllerAddress: string
  chainId: number
  rpcUrl: string
  contracts: {
    scoreboard?: string
    gameMatch?: string
  }
  factories: {
    scoreboard?: string
    gameMatch?: string
  }
  lastUpdated: string
}

/**
 * Client-safe configuration (no private key)
 */
export interface ClientOnchainConfig {
  controllerAddress: string
  chainId: number
  contracts: {
    scoreboard?: string
    gameMatch?: string
  }
  lastUpdated: string
}

/**
 * Load onchain configuration from build-generated file
 * SERVER-SIDE ONLY - includes private key
 * 
 * @returns Full config with private key, or null if not found
 */
export function loadOnchainConfigServer(): OnchainConfig | null {
  // Only allow on server
  if (typeof window !== 'undefined') {
    throw new Error('loadOnchainConfigServer must only be called server-side')
  }
  
  try {
    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(process.cwd(), '.onchain-cfg.json')
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(content)
    }
    
    return null
  } catch (error) {
    console.warn('Could not load .onchain-cfg.json:', error)
    return null
  }
}

/**
 * Load client-safe configuration (no private key)
 * Can be used on client or server
 * 
 * @returns Config without private key, or null if not found
 */
export function loadOnchainConfigClient(): ClientOnchainConfig | null {
  try {
    let config: OnchainConfig | null = null
    
    if (typeof window === 'undefined') {
      // Server-side: read from file
      const fs = require('fs')
      const path = require('path')
      const configPath = path.join(process.cwd(), '.onchain-cfg.json')
      
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        config = JSON.parse(content)
      }
    } else {
      // Client-side: should be injected via env or API
      // For now, we'll rely on provider reading from env vars set by config
      return null
    }
    
    if (!config) return null
    
    // Strip private key for client safety
    const { controllerPrivateKey, ...clientConfig } = config
    return clientConfig as ClientOnchainConfig
  } catch (error) {
    return null
  }
}

/**
 * Get contract address from config
 */
export function getContractFromConfig(
  config: ClientOnchainConfig | OnchainConfig | null,
  contractType: 'scoreboard' | 'gameMatch'
): string | undefined {
  if (!config) return undefined
  return config.contracts[contractType]
}

/**
 * Inject config values into environment
 * Should be called early in the app initialization (server-side)
 */
export function injectConfigIntoEnv() {
  if (typeof window !== 'undefined') return
  
  const config = loadOnchainConfigClient()
  if (!config) return
  
  // Inject contract addresses as env vars so existing code works
  if (config.contracts.scoreboard) {
    process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS = config.contracts.scoreboard
  }
  if (config.contracts.gameMatch) {
    process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE = config.contracts.gameMatch
  }
  
  // Inject chain ID and RPC
  process.env.NEXT_PUBLIC_CHAIN_ID = String(config.chainId)
}
