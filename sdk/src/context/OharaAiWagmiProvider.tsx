'use client'

import { ReactNode, useEffect, useState, useMemo } from 'react'
import { usePublicClient, useWalletClient, useChainId, useSwitchChain, useConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { anvil, baseSepolia, base, mainnet, sepolia } from 'viem/chains'
import { OharaAiProvider } from './OharaAiProvider'
import { getPreferredChainId } from '../config/oharaConfig'

// Known chains that wagmi's useConfig() might not include during SSR
const KNOWN_CHAINS = [anvil, baseSepolia, base, mainnet, sepolia]

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
  const [isSwitchingChain, setIsSwitchingChain] = useState(false)

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
      // Find target chain definition
      let targetChain = wagmiConfig.chains.find(c => c.id === targetChainId)
      if (!targetChain) {
        targetChain = KNOWN_CHAINS.find(c => c.id === targetChainId)
      }
      
      console.debug('[OharaAiWagmiProvider] Attempting chain switch:', {
        from: wagmiChainId,
        to: targetChainId,
        chainInConfig: !!wagmiConfig.chains.find(c => c.id === targetChainId),
        chainInKnown: !!KNOWN_CHAINS.find(c => c.id === targetChainId),
      })
      
      setIsSwitchingChain(true)
      switchChain(
        { chainId: targetChainId },
        {
          onSuccess: () => {
            console.debug('[OharaAiWagmiProvider] Chain switch successful to:', targetChainId)
            setIsSwitchingChain(false)
          },
          onError: (error) => {
            console.error('[OharaAiWagmiProvider] Chain switch failed:', error.message)
            setIsSwitchingChain(false)
          },
        }
      )
    }
  }, [isHydrated, wagmiChainId, propChainId, preferredChainId, switchChain, wagmiConfig.chains])
  
  // Try to get public client from wagmi first
  const wagmiPublicClient = usePublicClient({ chainId: effectiveChainId })
  // Get wallet client without forcing chainId - let the wallet switch happen first
  // Forcing chainId causes wagmi to error if wallet is on different chain
  const { data: walletClient, status: walletStatus, error: walletError } = useWalletClient()
  
  // Debug wallet connection
  useEffect(() => {
    if (isHydrated) {
      console.debug('[OharaAiWagmiProvider] Wallet status:', {
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
    
    // Try to find chain in wagmi config first
    let chain = wagmiConfig.chains.find(c => c.id === effectiveChainId)
    
    // If not in wagmi config (common during SSR), check known chains
    if (!chain) {
      chain = KNOWN_CHAINS.find(c => c.id === effectiveChainId)
    }
    
    // Last resort: create minimal chain definition
    if (!chain) {
      console.warn('[OharaAiWagmiProvider] Unknown chain, creating minimal definition for chainId:', effectiveChainId)
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
    
    // Create public client using http transport
    return createPublicClient({
      chain,
      transport: http(),
    })
  }, [effectiveChainId, wagmiPublicClient, wagmiConfig])
  
  // Use wagmi client if available, otherwise use fallback
  const publicClient = wagmiPublicClient || fallbackPublicClient

  // Don't provide wallet client if we're switching chains or if wallet is on wrong chain
  const isChainMismatch = walletClient?.chain?.id !== undefined && walletClient.chain.id !== effectiveChainId
  const effectiveWalletClient = isHydrated && !isSwitchingChain && !isChainMismatch ? walletClient : undefined
  const effectivePublicClient = isHydrated ? publicClient || undefined : undefined

  // Debug logging
  useEffect(() => {
    if (isHydrated) {
      console.debug('[OharaAiWagmiProvider] Debug Info:', {
        isHydrated,
        isSwitchingChain,
        isChainMismatch,
        wagmiChainId,
        preferredChainId,
        propChainId,
        effectiveChainId,
        publicClient: !!publicClient,
        publicClientChainId: publicClient?.chain?.id,
        walletClient: !!walletClient,
        walletClientChainId: walletClient?.chain?.id,
        effectiveWalletClient: !!effectiveWalletClient,
        effectivePublicClient: !!effectivePublicClient,
      })
    }
  }, [isHydrated, isSwitchingChain, isChainMismatch, wagmiChainId, preferredChainId, propChainId, effectiveChainId, publicClient, walletClient, effectiveWalletClient, effectivePublicClient])

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
