import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, hardhat, localhost } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Use custom RPC URL if provided, otherwise use default
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'

// Prioritize local chain for development
// Change order to [mainnet, sepolia, localhost] for production deployments
export const config = createConfig({
  chains: [localhost, hardhat, sepolia, mainnet],
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
    [localhost.id]: http(rpcUrl),
    [hardhat.id]: http(rpcUrl),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})
