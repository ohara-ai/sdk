import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react'
import { ComponentName } from '../metadata/componentDependencies'
import { ContractDependency, ContractType } from '../types/contracts'
import { 
  getContractDependencies,
  validateContractConfiguration,
} from '../utils/dependencies'

interface ContractAddresses {
  [key: string]: `0x${string}` | undefined
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
  
  // Read addresses from backend API (shared across all clients)
  useEffect(() => {
    if (typeof window === 'undefined' || !chainId) {
      return
    }
    
    const loadAddresses = async () => {
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
        
        if (data.addresses?.scoreboard && data.addresses.scoreboard !== '0x0000000000000000000000000000000000000000') {
          addresses[ContractType.SCOREBOARD] = data.addresses.scoreboard as `0x${string}`
        }
        
        setStorageAddresses(addresses)
      } catch (error) {
        console.error('Error loading contract addresses from backend:', error)
        setStorageAddresses({})
      }
    }
    
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
  
  // Merge addresses: backend storage overrides env vars (more dynamic)
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
  
  // Extract only the functions we need to avoid depending on the entire context
  const registerComponent = context?.registerComponent
  const unregisterComponent = context?.unregisterComponent
  
  useEffect(() => {
    if (!registerComponent || !unregisterComponent) {
      // If no provider, component can still work but without dependency tracking
      return
    }
    
    registerComponent(componentName)
    
    return () => {
      unregisterComponent(componentName)
    }
  }, [registerComponent, unregisterComponent, componentName])
}
