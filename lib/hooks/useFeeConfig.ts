'use client'

import { useReadContract } from 'wagmi'
import { GAME_MATCH_ABI } from '@/lib/contracts/gameMatch'

/**
 * Hook to read fee configuration from the GameMatch contract
 */
export function useFeeConfig(contractAddress?: `0x${string}`) {
  const { data: totalFeeShare, isLoading: isLoadingTotal } = useReadContract({
    address: contractAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'totalFeeShare',
    query: {
      enabled: !!contractAddress,
    },
  })

  const { data: gameScore } = useReadContract({
    address: contractAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'gameScore',
    query: {
      enabled: !!contractAddress,
    },
  })

  // Convert basis points to percentage (100 basis points = 1%)
  const totalFeePercentage = totalFeeShare 
    ? Number(totalFeeShare) / 100 
    : 0

  return {
    totalFeeShare: totalFeeShare || 0n,
    totalFeePercentage,
    gameScore: gameScore as `0x${string}` | undefined,
    isLoading: isLoadingTotal,
    hasContract: !!contractAddress,
  }
}
