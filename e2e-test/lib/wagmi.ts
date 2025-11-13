import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, anvil } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Use custom RPC URL if provided, otherwise use default
const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// Prioritize local chain for development (Anvil uses chain ID 31337)
// Change order to [mainnet, sepolia, localhost] for production deployments
export const config = createConfig({
  chains: [anvil, sepolia, mainnet],
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
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})
