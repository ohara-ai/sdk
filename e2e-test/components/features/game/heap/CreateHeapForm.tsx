'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseEther, isAddress, zeroAddress } from 'viem'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useTokenApproval } from '@ohara-ai/sdk'
import { useWalletClient, usePublicClient, useAccount } from 'wagmi'
import { HEAP_ABI } from '@ohara-ai/sdk'

interface CreateHeapFormProps {
  contractAddress: `0x${string}` | undefined
  onHeapCreated?: (heapId: number) => void
}

export function CreateHeapForm({ contractAddress, onHeapCreated }: CreateHeapFormProps) {
  const [contributionAmount, setContributionAmount] = useState('')
  const [maxContributions, setMaxContributions] = useState('2')
  const [tokenAddress, setTokenAddress] = useState('')
  const { status: walletStatus, data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { address } = useAccount()

  const [heapId, setHeapId] = useState<number | undefined>()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const isWalletReady = walletStatus === 'success'

  // Parse token and contribution for approval hook
  const token =
    tokenAddress && isAddress(tokenAddress) ? tokenAddress : zeroAddress
  const contribution = contributionAmount ? parseEther(contributionAmount) : 0n

  // Use token approval hook
  const {
    needsApproval,
    isNativeToken,
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
  } = useTokenApproval({
    tokenAddress: token,
    spenderAddress: contractAddress || zeroAddress,
    amount: contribution,
    enabled: !!contributionAmount && !!contractAddress,
  })

  const handleCreateHeap = async () => {
    if (!contractAddress || !walletClient || !publicClient || !address) {
      alert('Contract not deployed or wallet not connected')
      return
    }

    try {
      setIsPending(true)
      setError(null)
      setHeapId(undefined)
      const maxContributionsNum = Number(maxContributions)

      // Create heap transaction
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'create',
        args: [token, contribution, BigInt(maxContributionsNum)],
        value: isNativeToken ? contribution : 0n,
      })

      // Wait for receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      // Parse heapId from first topic (indexed parameter)
      let createdHeapId = 0
      if (receipt.logs.length > 0) {
        // The heapId is the first indexed parameter in HeapCreated event
        const firstLog = receipt.logs[0]
        if (firstLog.topics[1]) {
          createdHeapId = Number(BigInt(firstLog.topics[1]))
        }
      }

      setHeapId(createdHeapId)
      console.log('[CreateHeapForm] New heap created with ID:', createdHeapId)

      // Call the callback with the heapId
      if (onHeapCreated) {
        onHeapCreated(createdHeapId)
      }
    } catch (err) {
      console.error('Error creating heap:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsPending(false)
    }
  }

  const isLoading = isPending
  const isApprovalLoading = isApprovePending || isApproveConfirming

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Heap</CardTitle>
        <CardDescription>
          Set up a new heap for contributors to join
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contributionAmount">Contribution Amount</Label>
          <Input
            id="contributionAmount"
            type="number"
            step="0.001"
            placeholder="0.01"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Amount each contributor must add to the heap
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxContributions">Maximum Contributors</Label>
          <Input
            id="maxContributions"
            type="number"
            min="2"
            placeholder="2"
            value={maxContributions}
            onChange={(e) => setMaxContributions(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 2 contributors required
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenAddress">Token Address (Optional)</Label>
          <Input
            id="tokenAddress"
            placeholder="0x... (leave empty for ETH)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use native ETH, or specify ERC20 token address
          </p>
        </div>

        {/* Show approval status for custom tokens */}
        {!isNativeToken && token !== zeroAddress && (
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex items-start gap-2">
              {isApproveSuccess || !needsApproval ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isApproveSuccess || !needsApproval
                    ? 'Token Approved'
                    : 'Token Approval Required'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isApproveSuccess || !needsApproval
                    ? 'You can now create the heap'
                    : 'Approve the contract to spend your tokens'}
                </p>
              </div>
            </div>
            {needsApproval && (
              <Button
                onClick={approve}
                disabled={isApprovalLoading}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isApprovePending
                  ? 'Confirming...'
                  : isApproveConfirming
                    ? 'Approving...'
                    : 'Approve Token'}
              </Button>
            )}
          </div>
        )}

        {!isWalletReady && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Loader2 className="w-5 h-5 text-blue-500 mt-0.5 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-500">
                  Initializing Wallet
                </p>
                <p className="text-xs text-blue-500/80 mt-1">
                  Please wait while we connect to your wallet...
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateHeap}
          disabled={
            !contributionAmount ||
            !maxContributions ||
            isLoading ||
            !contractAddress ||
            needsApproval ||
            !isWalletReady
          }
          className="w-full"
        >
          {isPending ? 'Creating Heap...' : 'Create Heap'}
        </Button>

        {heapId !== undefined && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-500">
              Heap created successfully! Heap ID: {heapId}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">
              Error: {error?.message || 'Failed to create heap'}
            </p>
          </div>
        )}

        {approveError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">
              Approval Error: {approveError.message}
            </p>
          </div>
        )}

        {!contractAddress && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-500">
              Contract not deployed on this network. Please switch to a
              supported network.
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You will automatically contribute to the heap as the
            first contributor and your contribution will be locked immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
