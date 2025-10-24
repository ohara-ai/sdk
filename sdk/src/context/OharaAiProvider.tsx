import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react'
import { PublicClient, WalletClient, Address } from 'viem'
import { createClientMatchOperations } from '../core/match'
import { createScoreOperations } from '../core/scores'
import { OharaAiContext, GameContext, AppContext, OharaContext, InternalContext } from './OharaAiContext'
import type { DeployGameMatchParams, DeploymentResult } from './OharaAiContext'
import { usePublicClient, useWalletClient, useChainId } from 'wagmi'

const OharaAiContextInstance = createContext<OharaAiContext | undefined>(undefined)

interface OharaAiProviderProps {
  children: ReactNode
  /** Public client for reading blockchain data */
  publicClient?: PublicClient
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
  chainId 
}: OharaAiProviderProps) {
  const [gameMatchAddress, setGameMatchAddress] = useState<Address | undefined>()
  const [gameScoreAddress, setGameScoreAddress] = useState<Address | undefined>()
  const [controllerAddress, setControllerAddress] = useState<Address | undefined>()
  const [gameMatchFactory, setGameMatchFactory] = useState<Address | undefined>()
  const [gameScoreFactory, setGameScoreFactory] = useState<Address | undefined>()
  
  // Detect chain ID from wagmi if available
  const [detectedChainId, setDetectedChainId] = useState<number | undefined>(chainId)

  if (!publicClient) {
    publicClient = usePublicClient()
  }
  
  if (!walletClient) {
    const { data: wagmiWalletClient } = useWalletClient()
    walletClient = wagmiWalletClient
  }

  if (!chainId) {
    chainId = useChainId()
  }
  
  useEffect(() => {
    // Try to get chainId from wagmi config if available
    if (typeof window !== 'undefined' && !chainId) {
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
  }, [chainId])
  
  chainId = chainId || detectedChainId
  
  // Function to load addresses from backend
  const loadAddresses = async () => {
    if (typeof window === 'undefined' || !chainId) {
      return
    }
    
    try {
      const response = await fetch(`/api/addresses?chainId=${chainId}`)
      
      if (!response.ok) {
        console.error('Failed to fetch contract addresses:', response.statusText)
        setGameMatchAddress(undefined)
        setGameScoreAddress(undefined)
        return
      }
      
      const data = await response.json()
      
      // Extract addresses from new hierarchical structure
      const matchAddr = data.addresses?.game?.match
      const scoreAddr = data.addresses?.game?.score
      const ctrlAddr = data.addresses?.app?.controller
      const matchFactory = data.factories?.gameMatch
      const scoreFactory = data.factories?.gameScore
      
      if (matchAddr && matchAddr !== '0x0000000000000000000000000000000000000000') {
        setGameMatchAddress(matchAddr as Address)
      }
      
      if (scoreAddr && scoreAddr !== '0x0000000000000000000000000000000000000000') {
        setGameScoreAddress(scoreAddr as Address)
      }
      
      if (ctrlAddr) {
        setControllerAddress(ctrlAddr as Address)
      }
      
      if (matchFactory) {
        setGameMatchFactory(matchFactory as Address)
      }
      
      if (scoreFactory) {
        setGameScoreFactory(scoreFactory as Address)
      }
    } catch (error) {
      console.error('Error loading contract addresses from backend:', error)
      setGameMatchAddress(undefined)
      setGameScoreAddress(undefined)
      setControllerAddress(undefined)
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
  
  // Build context structure
  const ohara = useMemo<OharaContext>(() => ({
    contracts: {
      token: (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_HELLOWORLD_TOKEN
        : env.NEXT_PUBLIC_HELLOWORLD_TOKEN) as Address | undefined,
    },
  }), [env])
  
  const game = useMemo<GameContext>(() => ({
    match: {
      address: gameMatchAddress,
      operations: gameMatchAddress 
        ? createClientMatchOperations(gameMatchAddress, publicClient!, walletClient)
        : undefined,
    },
    scores: {
      address: gameScoreAddress,
      operations: gameScoreAddress
        ? createScoreOperations(gameScoreAddress, publicClient!)
        : undefined,
    },
  }), [gameMatchAddress, gameScoreAddress, publicClient, walletClient])
  
  const app = useMemo<AppContext>(() => ({
    coin: {
      address: (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_APP_COIN
        : env.NEXT_PUBLIC_APP_COIN) as Address | undefined,
    },
    controller: {
      address: controllerAddress,
    },
  }), [env, controllerAddress])
  
  const internal = useMemo<InternalContext>(() => ({
    chainId,
    factories: {
      gameMatch: gameMatchFactory,
      gameScore: gameScoreFactory,
    },
  }), [chainId, gameMatchFactory, gameScoreFactory])
  
  // Deployment methods
  const deployGameScore = async (): Promise<DeploymentResult> => {
    if (typeof window === 'undefined') {
      throw new Error('Deployment can only be called from the browser')
    }
    
    const response = await fetch('/api/deploy-game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
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
  
  const value: OharaAiContext = {
    ohara,
    game,
    app,
    internal,
    deployGameScore,
    deployGameMatch,
    refreshAddresses,
  }
  
  return (
    <OharaAiContextInstance.Provider value={value}>
      {children}
    </OharaAiContextInstance.Provider>
  )
}

/**
 * Hook to access Ohara AI SDK context
 * Provides access to hierarchical context structure
 * 
 * @example
 * ```tsx
 * const { game, ohara, app, internal } = useOharaAi()
 * 
 * // Create a match
 * if (game.match.operations) {
 *   const hash = await game.match.operations.create({
 *     token: ohara.contracts.token || '0x...',
 *     stakeAmount: parseEther('0.1'),
 *     maxPlayers: 2
 *   })
 * }
 * 
 * // Get top scores
 * if (game.scores.operations) {
 *   const topPlayers = await game.scores.operations.getTopPlayersByWins(10)
 * }
 * ```
 */
export function useOharaAi(): OharaAiContext {
  const context = useContext(OharaAiContextInstance)
  if (!context) {
    throw new Error('useOharaAi must be used within OharaAiProvider')
  }
  return context
}
