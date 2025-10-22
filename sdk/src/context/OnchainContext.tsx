import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react'
import { PublicClient, WalletClient } from 'viem'
import { ContractType } from '../types/contracts'
import { createAppOperations, AppOperations, resolveContractAddresses } from '../core/app'

interface ContractAddresses {
  [key: string]: `0x${string}` | undefined
}

interface DeployGameScoreParams {
  factoryAddress: `0x${string}`
}

interface DeployGameMatchParams {
  factoryAddress: `0x${string}`
  gameScoreAddress?: `0x${string}`
  feeRecipients?: string[]
  feeShares?: string[]
}

interface DeploymentResult {
  success: true
  address: `0x${string}`
  transactionHash: `0x${string}`
  authorizationWarning?: string
  authorizationError?: string
}

interface OnchainContextValue {
  /** App operations providing Match and Scores primitives */
  app: AppOperations
  
  /** Get contract address by type */
  getContractAddress: (contractType: ContractType) => `0x${string}` | undefined
  
  /** Contract addresses resolved from environment and localStorage */
  addresses: ContractAddresses
  
  /** Check if match operations are available */
  hasMatchSupport: () => boolean
  
  /** Check if score operations are available */
  hasScoreSupport: () => boolean
  
  /** Deploy a new GameScore contract instance */
  deployGameScore: (params: DeployGameScoreParams) => Promise<DeploymentResult>
  
  /** Deploy a new GameMatch contract instance */
  deployGameMatch: (params: DeployGameMatchParams) => Promise<DeploymentResult>
  
  /** Factory addresses from environment */
  factoryAddresses: {
    gameMatchFactory?: `0x${string}`
    gameScoreFactory?: `0x${string}`
  }
  
  /** Manually refresh contract addresses from backend */
  refreshAddresses: () => Promise<void>
}

const OharaAiContext = createContext<OnchainContextValue | undefined>(undefined)

interface OharaAiProviderProps {
  children: ReactNode
  /** Public client for reading blockchain data */
  publicClient: PublicClient
  /** Wallet client for write operations (optional) */
  walletClient?: WalletClient
  /** Environment variables to use for address resolution (defaults to process.env) */
  env?: Record<string, string | undefined>
  /** Chain ID for localStorage keys (optional, will try to detect from window) */
  chainId?: number
}

/**
 * Provider that manages on-chain operations and contract coordination
 * 
 * Exposes functional primitives (Match, Scores, App) for building on-chain applications
 * without dealing with blockchain complexity directly.
 * 
 * @example
 * ```tsx
 * <OharaAiProvider publicClient={publicClient} walletClient={walletClient}>
 *   <YourApp />
 * </OharaAiProvider>
 * ```
 */
export function OharaAiProvider({ 
  children, 
  publicClient,
  walletClient,
  env = process.env, 
  chainId: chainIdProp 
}: OharaAiProviderProps) {
  const [storageAddresses, setStorageAddresses] = useState<ContractAddresses>({})
  
  // Detect chain ID from wagmi if available
  const [detectedChainId, setDetectedChainId] = useState<number | undefined>(chainIdProp)
  
  useEffect(() => {
    // Try to get chainId from wagmi config if available
    if (typeof window !== 'undefined' && !chainIdProp) {
      try {
        // @ts-ignore - wagmi might be available globally
        const wagmiChainId = window.__wagmi_chainId
        if (wagmiChainId) {
          setDetectedChainId(wagmiChainId)
        }
      } catch {
        // Ignore if wagmi not available
      }
    }
  }, [chainIdProp])
  
  const chainId = chainIdProp || detectedChainId
  
  // Function to load addresses from backend
  const loadAddresses = async () => {
    if (typeof window === 'undefined' || !chainId) {
      return
    }
    
    try {
      const response = await fetch(`/api/contracts?chainId=${chainId}`)
      
      if (!response.ok) {
        console.error('Failed to fetch contract addresses:', response.statusText)
        setStorageAddresses({})
        return
      }
      
      const data = await response.json()
      const addresses: ContractAddresses = {}
      
      // Map backend keys (camelCase) to ContractType enum values
      if (data.addresses?.gameMatch && data.addresses.gameMatch !== '0x0000000000000000000000000000000000000000') {
        addresses[ContractType.GAME_MATCH] = data.addresses.gameMatch as `0x${string}`
      }
      
      if (data.addresses?.gameScore && data.addresses.gameScore !== '0x0000000000000000000000000000000000000000') {
        addresses[ContractType.GAMESCORE] = data.addresses.gameScore as `0x${string}`
      }
      
      setStorageAddresses(addresses)
    } catch (error) {
      console.error('Error loading contract addresses from backend:', error)
      setStorageAddresses({})
    }
  }
  
  // Read addresses from backend API (shared across all clients)
  useEffect(() => {
    loadAddresses()
    
    // Poll for changes every 10 seconds to keep all clients in sync
    const pollInterval = setInterval(loadAddresses, 10000)
    
    // Also listen for custom events (for immediate updates after deployment)
    const handleCustomEvent = () => loadAddresses()
    window.addEventListener('contractDeployed', handleCustomEvent)
    
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('contractDeployed', handleCustomEvent)
    }
  }, [chainId])
  
  
  // Merge addresses: backend storage overrides env vars (more dynamic)
  const addresses: ContractAddresses = useMemo(() => ({
    [ContractType.GAMESCORE]: 
      storageAddresses[ContractType.GAMESCORE] ||
      (env.NEXT_PUBLIC_GAMESCORE_ADDRESS || env.NEXT_PUBLIC_GAMESCORE_INSTANCE) as `0x${string}` | undefined,
    [ContractType.GAME_MATCH]: 
      storageAddresses[ContractType.GAME_MATCH] ||
      (env.NEXT_PUBLIC_GAME_MATCH_INSTANCE || env.NEXT_PUBLIC_GAME_MATCH_ADDRESS) as `0x${string}` | undefined,
  }), [storageAddresses, env])
  
  // Create App operations with resolved addresses
  const app = useMemo(() => {
    const resolved = resolveContractAddresses(env, chainId)
    
    return createAppOperations({
      gameMatchAddress: addresses[ContractType.GAME_MATCH] || resolved.gameMatchAddress,
      gameScoreAddress: addresses[ContractType.GAMESCORE] || resolved.gameScoreAddress,
      publicClient,
      walletClient,
      chainId,
    })
  }, [addresses, publicClient, walletClient, chainId, env])
  
  // Helper to get contract address by type
  const getContractAddress = (contractType: ContractType): `0x${string}` | undefined => {
    return addresses[contractType]
  }
  
  // Factory addresses from environment
  const factoryAddresses = useMemo(() => ({
    gameMatchFactory: env.NEXT_PUBLIC_GAME_MATCH_FACTORY as `0x${string}` | undefined,
    gameScoreFactory: env.NEXT_PUBLIC_GAMESCORE_FACTORY as `0x${string}` | undefined,
  }), [env])
  
  // Deployment methods
  const deployGameScore = async (params: DeployGameScoreParams): Promise<DeploymentResult> => {
    if (typeof window === 'undefined') {
      throw new Error('Deployment can only be called from the browser')
    }
    
    const response = await fetch('/api/deploy-game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factoryAddress: params.factoryAddress }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Deployment failed')
    }
    
    // Refresh addresses after successful deployment
    await loadAddresses()
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('contractDeployed'))
    
    return data
  }
  
  const deployGameMatch = async (params: DeployGameMatchParams): Promise<DeploymentResult> => {
    if (typeof window === 'undefined') {
      throw new Error('Deployment can only be called from the browser')
    }
    
    const response = await fetch('/api/deploy-game-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factoryAddress: params.factoryAddress,
        gameScoreAddress: params.gameScoreAddress,
        feeRecipients: params.feeRecipients,
        feeShares: params.feeShares,
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Deployment failed')
    }
    
    // Refresh addresses after successful deployment
    await loadAddresses()
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('contractDeployed'))
    
    return data
  }
  
  const refreshAddresses = async () => {
    await loadAddresses()
  }
  
  const value: OnchainContextValue = {
    app,
    getContractAddress,
    addresses,
    hasMatchSupport: () => app.hasMatchSupport(),
    hasScoreSupport: () => app.hasScoreSupport(),
    deployGameScore,
    deployGameMatch,
    factoryAddresses,
    refreshAddresses,
  }
  
  return (
    <OharaAiContext.Provider value={value}>
      {children}
    </OharaAiContext.Provider>
  )
}

/**
 * Hook to access Ohara AI SDK context
 * Provides access to Match, Scores, and App functional primitives
 * 
 * @example
 * ```tsx
 * const { app } = useOharaAi()
 * 
 * // Create a match
 * const { matchId } = await app.match?.create({
 *   token: '0x...',
 *   stakeAmount: parseEther('0.1'),
 *   maxPlayers: 2
 * })
 * 
 * // Get top scores
 * const topPlayers = await app.scores?.getTopPlayersByWins(10)
 * ```
 */
export function useOharaAi() {
  const context = useContext(OharaAiContext)
  if (!context) {
    throw new Error('useOharaAi must be used within OharaAiProvider')
  }
  return context
}
