'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { config } from '@/lib/wagmi'
import { useState } from 'react'
import { OharaAiProvider } from '@ohara-ai/sdk'

function OharaAiWrapper({ children }: { children: React.ReactNode }) {
  // Call Wagmi hooks here, inside WagmiProvider context
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()

  return (
    <OharaAiProvider 
      publicClient={publicClient as any}
      walletClient={(walletClient || undefined) as any}
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
        <OharaAiWrapper>
          {children}
        </OharaAiWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
