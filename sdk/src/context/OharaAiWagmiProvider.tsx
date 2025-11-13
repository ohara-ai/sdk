'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { OharaAiProvider } from './OharaAiProvider'

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

  return (
    <OharaAiProvider 
      publicClient={isHydrated ? publicClient as any : undefined}
      walletClient={isHydrated ? (walletClient || undefined) as any : undefined}
      chainId={isHydrated ? chainId : undefined}
    >
      {children}
    </OharaAiProvider>
  )
}
