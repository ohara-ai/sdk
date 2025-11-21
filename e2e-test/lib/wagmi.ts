import { createConfig, http } from 'wagmi'
import { anvil, baseSepolia, base } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Use custom RPC URL if provided, otherwise use default
const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// Default chain constellation: Anvil (local dev), Base Sepolia (testnet), Base (mainnet)
// Prioritize local chain for development (Anvil uses chain ID 31337)
export const config = createConfig({
  chains: [anvil, baseSepolia, base],
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
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
})
