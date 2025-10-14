import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ERC20_ABI } from '@/lib/contracts/erc20'
import { zeroAddress } from 'viem'
import { useEffect, useState } from 'react'

interface UseTokenApprovalProps {
  tokenAddress: string
  spenderAddress: string
  amount: bigint
  enabled?: boolean
}

export function useTokenApproval({
  tokenAddress,
  spenderAddress,
  amount,
  enabled = true,
}: UseTokenApprovalProps) {
  const { address } = useAccount()
  const [needsApproval, setNeedsApproval] = useState(false)

  // Skip if using native token (ETH)
  const isNativeToken = tokenAddress === zeroAddress || !tokenAddress
  const shouldCheck = enabled && !isNativeToken && !!address && !!spenderAddress && amount > 0n

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: isNativeToken ? undefined : (tokenAddress as `0x${string}`),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress as `0x${string}`] : undefined,
    query: {
      enabled: shouldCheck,
    },
  })

  // Approve hook
  const {
    data: approveHash,
    writeContract: approve,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract()

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveSuccess,
  } = useWaitForTransactionReceipt({ hash: approveHash })

  // Check if approval is needed
  useEffect(() => {
    if (!shouldCheck) {
      setNeedsApproval(false)
      return
    }

    const currentAllowance = allowance as bigint | undefined
    setNeedsApproval(currentAllowance !== undefined && currentAllowance < amount)
  }, [allowance, amount, shouldCheck])

  // Refetch allowance after successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  const handleApprove = () => {
    if (isNativeToken || !spenderAddress) return

    approve({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress as `0x${string}`, amount],
    })
  }

  return {
    needsApproval,
    isNativeToken,
    allowance: allowance as bigint | undefined,
    approve: handleApprove,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
    refetchAllowance,
  }
}
