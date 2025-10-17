import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react'
import { ComponentName } from '../metadata/componentDependencies'
import { ContractDependency, ContractType } from '../types/contracts'
import { 
  getContractDependencies,
  validateContractConfiguration,
} from '../utils/dependencies'

interface ContractAddresses {
  [ContractType.SCOREBOARD]?: `0x${string}`
  [ContractType.GAME_MATCH]?: `0x${string}`
}

interface OnchainContextValue {
  /** Currently active (mounted) components */
  activeComponents: Set<ComponentName>
  /** Register a component as active */
  registerComponent: (name: ComponentName) => void
  /** Unregister a component */
  unregisterComponent: (name: ComponentName) => void
  /** All contract dependencies based on active components */
  dependencies: ContractDependency[]
  /** Validation result for active components */
  validation: {
    valid: boolean
    missing: ContractDependency[]
    configured: ContractDependency[]
  }
  /** Environment variables (for contract addresses) */
  env: Record<string, string | undefined>
  /** Get contract address by type */
  getContractAddress: (contractType: ContractType) => `0x${string}` | undefined
  /** Contract addresses resolved from environment and localStorage */
  addresses: ContractAddresses
}

const OharaAiContext = createContext<OnchainContextValue | undefined>(undefined)

interface OharaAiProviderProps {
  children: ReactNode
  /** Environment variables to use for validation (defaults to process.env) */
  env?: Record<string, string | undefined>
  /** Chain ID for localStorage keys (optional, will try to detect from window) */
  chainId?: number
}

/**
 * Provider that tracks active SDK components and manages contract dependencies
 * 
 * Wrap your app with this provider to enable automatic contract dependency detection:
 * 
 * @example
 * ```tsx
 * <OharaAiProvider>
 *   <YourApp />
 * </OharaAiProvider>
 * ```
 */
export function OharaAiProvider({ children, env = process.env, chainId: chainIdProp }: OharaAiProviderProps) {
  const [activeComponents, setActiveComponents] = useState<Set<ComponentName>>(new Set())
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
  
  // Read addresses from localStorage (reactive to changes)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const loadAddresses = () => {
      const addresses: ContractAddresses = {}
      
      if (chainId) {
        // Load from localStorage with chain-specific keys
        const gameMatchKey = `deployed_game_match_${chainId}`
        const scoreboardKey = `deployed_scoreboard_${chainId}`
        
        const gameMatch = localStorage.getItem(gameMatchKey)
        const scoreboard = localStorage.getItem(scoreboardKey)
        
        if (gameMatch && gameMatch !== '0x0000000000000000000000000000000000000000') {
          addresses[ContractType.GAME_MATCH] = gameMatch as `0x${string}`
        }
        
        if (scoreboard && scoreboard !== '0x0000000000000000000000000000000000000000') {
          addresses[ContractType.SCOREBOARD] = scoreboard as `0x${string}`
        }
      }
      
      setStorageAddresses(addresses)
    }
    
    loadAddresses()
    
    // Listen for localStorage changes (e.g., from contract deployment)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('deployed_')) {
        loadAddresses()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-window updates)
    const handleCustomEvent = () => loadAddresses()
    window.addEventListener('contractDeployed', handleCustomEvent)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('contractDeployed', handleCustomEvent)
    }
  }, [chainId])
  
  const registerComponent = useCallback((name: ComponentName) => {
    setActiveComponents(prev => {
      const next = new Set(prev)
      next.add(name)
      return next
    })
  }, [])
  
  const unregisterComponent = useCallback((name: ComponentName) => {
    setActiveComponents(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])
  
  // Calculate dependencies based on active components
  const dependencies = useMemo(() => 
    getContractDependencies(Array.from(activeComponents)),
    [activeComponents]
  )
  
  // Merge addresses: localStorage overrides env vars (more dynamic)
  const addresses: ContractAddresses = useMemo(() => ({
    [ContractType.SCOREBOARD]: 
      storageAddresses[ContractType.SCOREBOARD] ||
      (env.NEXT_PUBLIC_SCOREBOARD_ADDRESS || env.NEXT_PUBLIC_SCOREBOARD_INSTANCE) as `0x${string}` | undefined,
    [ContractType.GAME_MATCH]: 
      storageAddresses[ContractType.GAME_MATCH] ||
      (env.NEXT_PUBLIC_GAME_MATCH_INSTANCE || env.NEXT_PUBLIC_GAME_MATCH_ADDRESS) as `0x${string}` | undefined,
  }), [storageAddresses, env])
  
  // Validate configuration (use merged addresses for validation)
  const validation = useMemo(() => {
    // Create a temporary env object with merged addresses for validation
    const mergedEnv = {
      ...env,
      NEXT_PUBLIC_SCOREBOARD_ADDRESS: addresses[ContractType.SCOREBOARD],
      NEXT_PUBLIC_GAME_MATCH_INSTANCE: addresses[ContractType.GAME_MATCH],
    }
    return validateContractConfiguration(Array.from(activeComponents), mergedEnv)
  }, [activeComponents, addresses, env])
  
  // Helper to get contract address by type
  const getContractAddress = useCallback((contractType: ContractType): `0x${string}` | undefined => {
    return addresses[contractType]
  }, [addresses])
  
  const value: OnchainContextValue = {
    activeComponents,
    registerComponent,
    unregisterComponent,
    dependencies,
    validation,
    env,
    getContractAddress,
    addresses,
  }
  
  return (
    <OharaAiContext.Provider value={value}>
      {children}
    </OharaAiContext.Provider>
  )
}

/**
 * Hook to access Ohara AI SDK context
 * 
 * @example
 * ```tsx
 * const { dependencies, validation } = useOharaAi()
 * 
 * if (!validation.valid) {
 *   return <div>Missing contracts: {validation.missing.map(m => m.contract).join(', ')}</div>
 * }
 * ```
 */
export function useOharaAi() {
  const context = useContext(OharaAiContext)
  if (!context) {
    throw new Error('useOharaAi must be used within OharaAiProvider')
  }
  return context
}

/**
 * Hook for SDK components to register themselves
 * Automatically registers on mount and unregisters on unmount
 * 
 * @param componentName - Name of the component
 * 
 * @example
 * ```tsx
 * export function MyComponent() {
 *   useComponentRegistration('MyComponent')
 *   // ... rest of component
 * }
 * ```
 */
export function useComponentRegistration(componentName: ComponentName) {
  const context = useContext(OharaAiContext)
  
  useEffect(() => {
    if (!context) {
      // If no provider, component can still work but without dependency tracking
      return
    }
    
    context.registerComponent(componentName)
    
    return () => {
      context.unregisterComponent(componentName)
    }
  }, [context, componentName])
}
