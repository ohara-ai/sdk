'use client'

import { useChainId } from 'wagmi'
import { getGameMatchAddress, getGameMatchFactoryAddress } from '@/lib/contracts/gameMatch'

/**
 * Hook to access contract configuration information
 */
export function useContractInfo() {
  const chainId = useChainId()
  const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS as `0x${string}` | undefined
  const controllerAddress = process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS as `0x${string}` | undefined
  const contractAddress = getGameMatchAddress(chainId)
  const factoryAddress = getGameMatchFactoryAddress()
  const devWorldTokenAddress = process.env.NEXT_PUBLIC_DEVWORLD_TOKEN as `0x${string}` | undefined

  return {
    ownerAddress,
    controllerAddress,
    contractAddress,
    factoryAddress,
    devWorldTokenAddress,
  }
}
