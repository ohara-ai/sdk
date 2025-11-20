import { useState, useEffect } from 'react'
import { Address, zeroAddress } from 'viem'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { ERC20_ABI } from '../abis/erc/erc20'

export interface UseTokenApprovalParams {
  /** Token address to approve (use zeroAddress for native token) */
  tokenAddress: Address
  /** Spender address (usually a contract address) */
  spenderAddress: Address
  /** Amount to approve */
  amount: bigint
  /** Enable the hook */
  enabled?: boolean
}

export interface UseTokenApprovalReturn {
  /** Whether approval is needed */
  needsApproval: boolean
  /** Whether the token is the native token (ETH) */
  isNativeToken: boolean
  /** Current allowance */
  allowance: bigint
  /** Function to approve tokens */
  approve: () => void
  /** Whether the approval transaction is pending */
  isApprovePending: boolean
  /** Whether the approval transaction is confirming */
  isApproveConfirming: boolean
  /** Whether the approval was successful */
  isApproveSuccess: boolean
  /** Approval error if any */
  approveError: Error | null
}

/**
 * Hook to manage ERC20 token approvals
 * Automatically checks allowance and provides approve function
 *
 * @example
 * ```tsx
 * const { needsApproval, approve, isApprovePending } = useTokenApproval({
 *   tokenAddress: '0x...',
 *   spenderAddress: gameMatchAddress,
 *   amount: parseEther('1.0'),
 * })
 *
 * if (needsApproval) {
 *   return <button onClick={approve}>Approve Token</button>
 * }
 * ```
 */
export function useTokenApproval({
  tokenAddress,
  spenderAddress,
  amount,
  enabled = true,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const { address: userAddress } = useAccount()
  const [allowance, setAllowance] = useState<bigint>(0n)

  // Check if this is the native token (ETH)
  const isNativeToken = tokenAddress === zeroAddress

  // Read current allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args:
      userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: enabled && !isNativeToken && !!userAddress && !!spenderAddress,
    },
  })

  // Update allowance when data changes
  useEffect(() => {
    if (allowanceData !== undefined) {
      setAllowance(allowanceData as bigint)
    }
  }, [allowanceData])

  // Approve tokens
  const {
    data: approveHash,
    writeContract,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    })

  // Refetch allowance after successful approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance()
    }
  }, [isApproveSuccess, refetchAllowance])

  // Determine if approval is needed
  const needsApproval =
    !isNativeToken && enabled && amount > 0n && allowance < amount

  // Approve function
  const approve = () => {
    if (!userAddress || !spenderAddress || isNativeToken) {
      return
    }

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    })
  }

  return {
    needsApproval,
    isNativeToken,
    allowance,
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError: approveError as Error | null,
  }
}
