'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { config } from '@/lib/wagmi'
import { OharaAiWagmiProvider } from '@ohara-ai/sdk'
import '@coinbase/onchainkit/styles.css'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={config.chains[0]}
          config={{
            appearance: {
              mode: 'auto', // 'light' | 'dark' | 'auto'
            },
            wallet: {
              display: 'modal', // 'modal' | 'drawer'
            },
          }}
        >
          <OharaAiWagmiProvider>{children}</OharaAiWagmiProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
