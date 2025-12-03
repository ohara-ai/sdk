'use client'

import { ReactNode, useEffect, useState, useMemo } from 'react'
import { usePublicClient, useWalletClient, useChainId, useSwitchChain, useConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { OharaAiProvider } from './OharaAiProvider'
import { getPreferredChainId } from '../config/oharaConfig'

interface OharaAiWagmiProviderProps {
  children: ReactNode
  /** Optional: Override the chain ID to use (otherwise uses NEXT_PUBLIC_SDK_CHAIN_ID or wagmi's chain) */
  chainId?: number
}

/**
 * Simplified provider that automatically bridges Wagmi hooks to OharaAiProvider.
 *
 * This component must be used inside WagmiProvider context.
 * It automatically detects and passes the public client, wallet client, and chain ID
 * from wagmi hooks to the OharaAiProvider.
 * 
 * **Chain Selection:**
 * When users haven't connected their wallet, the provider automatically switches to the
 * preferred chain ID configured via `NEXT_PUBLIC_SDK_CHAIN_ID` environment variable.
 * Once a wallet is connected, the user's selected chain takes precedence.
 *
 * @example
 * ```tsx
 * import { WagmiProvider } from 'wagmi'
 * import { QueryClientProvider } from '@tanstack/react-query'
 * import { OharaAiWagmiProvider } from '@ohara-ai/sdk'
 *
 * function Providers({ children }) {
 *   return (
 *     <WagmiProvider config={config}>
 *       <QueryClientProvider client={queryClient}>
 *         <OharaAiWagmiProvider>
 *           {children}
 *         </OharaAiWagmiProvider>
 *       </QueryClientProvider>
 *     </WagmiProvider>
 *   )
 * }
 * ```
 */
export function OharaAiWagmiProvider({ children, chainId: propChainId }: OharaAiWagmiProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  // Defer hook subscriptions until after hydration to prevent setState-during-render warnings
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const wagmiConfig = useConfig()
  const wagmiChainId = useChainId()
  const preferredChainId = getPreferredChainId()
  const { switchChain } = useSwitchChain()
  
  // Priority: prop chainId > env var chainId > wagmi chain ID
  const effectiveChainId = propChainId || preferredChainId || wagmiChainId
  
  // Auto-switch wagmi to the preferred chain if they don't match
  useEffect(() => {
    if (!isHydrated || !switchChain) return
    
    const targetChainId = propChainId || preferredChainId
    if (targetChainId && wagmiChainId !== targetChainId) {
      console.log('[OharaAiWagmiProvider] Switching chain:', {
        from: wagmiChainId,
        to: targetChainId,
      })
      switchChain({ chainId: targetChainId })
    }
  }, [isHydrated, wagmiChainId, propChainId, preferredChainId, switchChain])
  
  // Try to get public client from wagmi first
  const wagmiPublicClient = usePublicClient({ chainId: effectiveChainId })
  // Get wallet client for the target chain explicitly
  const { data: walletClient, status: walletStatus, error: walletError } = useWalletClient({ 
    chainId: effectiveChainId 
  })
  
  // Debug wallet connection
  useEffect(() => {
    if (isHydrated) {
      console.log('[OharaAiWagmiProvider] Wallet status:', {
        status: walletStatus,
        hasWallet: !!walletClient,
        walletChainId: walletClient?.chain?.id,
        walletAccount: walletClient?.account?.address,
        error: walletError?.message,
      })
    }
  }, [isHydrated, walletStatus, walletClient, walletError])
  
  // Create fallback public client if wagmi doesn't have one ready
  const fallbackPublicClient = useMemo(() => {
    if (!effectiveChainId || wagmiPublicClient) return undefined
    
    // Find the chain config from wagmi config
    console.log('[OharaAiWagmiProvider] Looking for chain:', {
      effectiveChainId,
      availableChains: wagmiConfig.chains.map(c => ({ id: c.id, name: c.name })),
    })
    let chain = wagmiConfig.chains.find(c => c.id === effectiveChainId)
    
    if (!chain) {
      console.warn('[OharaAiWagmiProvider] Chain not in wagmi config, creating minimal chain definition for chainId:', effectiveChainId)
      
      // Create a minimal chain definition for the missing chain
      // This handles cases where wagmi's config doesn't include all chains
      chain = {
        id: effectiveChainId,
        name: `Chain ${effectiveChainId}`,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: ['http://localhost:8545'] },
          public: { http: ['http://localhost:8545'] },
        },
      } as any
    }
    
    console.log('[OharaAiWagmiProvider] Creating fallback public client for chain:', effectiveChainId)
    
    // Create public client using http transport
    return createPublicClient({
      chain,
      transport: http(),
    })
  }, [effectiveChainId, wagmiPublicClient, wagmiConfig])
  
  // Use wagmi client if available, otherwise use fallback
  const publicClient = wagmiPublicClient || fallbackPublicClient

  const effectiveWalletClient = isHydrated ? walletClient : undefined
  const effectivePublicClient = isHydrated ? publicClient || undefined : undefined

  // Debug logging
  useEffect(() => {
    if (isHydrated) {
      console.log('[OharaAiWagmiProvider] Debug Info:', {
        isHydrated,
        wagmiChainId,
        preferredChainId,
        propChainId,
        effectiveChainId,
        publicClient: !!publicClient,
        publicClientChainId: publicClient?.chain?.id,
        walletClient: !!walletClient,
        effectivePublicClient: !!effectivePublicClient,
      })
    }
  }, [isHydrated, wagmiChainId, preferredChainId, propChainId, effectiveChainId, publicClient, walletClient, effectivePublicClient])

  return (
    <OharaAiProvider
      publicClient={effectivePublicClient}
      walletClient={effectiveWalletClient}
      chainId={isHydrated ? effectiveChainId : undefined}
    >
      {children}
    </OharaAiProvider>
  )
}
