import { createConfig, createStorage, http } from 'wagmi'
import { anvil, baseSepolia, base } from 'wagmi/chains'
import { coinbaseWallet, injected, metaMask } from 'wagmi/connectors'

// Use custom RPC URL if provided, otherwise use default
const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// Get preferred chain ID from environment
const preferredChainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_SDK_CHAIN_ID)
  : null

// Available chains
const allChains = [anvil, baseSepolia, base] as const

// Reorder chains to prioritize the preferred chain
const chains = preferredChainId
  ? [
      ...allChains.filter((chain) => {
        return chain.id === preferredChainId
      }),
      ...allChains.filter((chain) => chain.id !== preferredChainId),
    ]
  : allChains

// Default chain constellation: Anvil (local dev), Base Sepolia (testnet), Base (mainnet)
// The first chain in the array is used as the default
export const config = createConfig({
  chains: chains as [typeof anvil, ...typeof allChains],
  connectors: [
    metaMask(),
    coinbaseWallet(),
    injected({
      shimDisconnect: true,
      target: 'phantom',
    }),
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [anvil.id]: http(rpcUrl),
    [baseSepolia.id]: http(rpcUrl),
    [base.id]: http(rpcUrl),
  },
  storage: createStorage({
    key: `wagmi-e2e-${preferredChainId || 'default'}`,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }),
  ssr: true,
})
