import { createConfig, http } from 'wagmi'
import { anvil, baseSepolia, base } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Use custom RPC URL if provided, otherwise use default
const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// Get preferred chain ID from environment
const preferredChainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_SDK_CHAIN_ID)
  : null

console.log('[wagmi config] Chain setup:', {
  envVar: process.env.NEXT_PUBLIC_SDK_CHAIN_ID,
  preferredChainId,
  anvilId: anvil.id,
  baseSepoliaId: baseSepolia.id,
  baseId: base.id,
})

// Available chains
const allChains = [anvil, baseSepolia, base]

// Reorder chains to prioritize the preferred chain
const chains = preferredChainId
  ? [
      ...allChains.filter((chain) => {
        console.log('[wagmi config] Checking chain:', chain.id, '===', preferredChainId, '?', chain.id === preferredChainId)
        return chain.id === preferredChainId
      }),
      ...allChains.filter((chain) => chain.id !== preferredChainId),
    ]
  : allChains

console.log('[wagmi config] Final chains:', chains.map(c => ({ id: c.id, name: c.name })))

// Default chain constellation: Anvil (local dev), Base Sepolia (testnet), Base (mainnet)
// The first chain in the array is used as the default
export const config = createConfig({
  chains: chains as [typeof anvil, ...typeof allChains],
  connectors: [
    metaMask(),
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
})
