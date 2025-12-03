'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePublicClient, useWalletClient, useChainId, useSwitchChain } from 'wagmi'
import { OharaAiProvider } from './OharaAiProvider'
import { getPreferredChainId } from '../config/oharaConfig'

interface OharaAiWagmiProviderProps {
  children: ReactNode
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
export function OharaAiWagmiProvider({ children }: OharaAiWagmiProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  // Defer hook subscriptions until after hydration to prevent setState-during-render warnings
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  // Switch to preferred chain when user hasn't connected wallet
  useEffect(() => {
    if (!isHydrated) return

    const preferredChainId = getPreferredChainId()
    
    // Only switch if:
    // 1. There's a preferred chain ID configured
    // 2. User hasn't connected their wallet (no walletClient)
    // 3. Current chain differs from preferred chain
    // 4. switchChain function is available
    if (
      preferredChainId &&
      !walletClient &&
      chainId !== preferredChainId &&
      switchChain
    ) {
      switchChain({ chainId: preferredChainId })
    }
  }, [isHydrated, walletClient, chainId, switchChain])

  return (
    <OharaAiProvider
      publicClient={isHydrated ? publicClient || undefined : undefined}
      walletClient={isHydrated ? walletClient || undefined : undefined}
      chainId={isHydrated ? chainId : undefined}
    >
      {children}
    </OharaAiProvider>
  )
}
