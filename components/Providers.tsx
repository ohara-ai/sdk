'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { config } from '@/lib/wagmi'
import { useState } from 'react'
import { OharaAiProvider } from '@/sdk/src'

function OharaAiProviderWrapper({ children }: { children: React.ReactNode }) {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  // Wait for publicClient to be ready
  if (!publicClient) {
    return <div>Loading...</div>
  }
  
  return (
    <OharaAiProvider 
      publicClient={publicClient} 
      walletClient={walletClient}
      chainId={chainId}
    >
      {children}
    </OharaAiProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OharaAiProviderWrapper>
          {children}
        </OharaAiProviderWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
