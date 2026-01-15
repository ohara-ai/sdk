'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Trophy,
  Coins,
  Banknote,
  CheckCircle2,
  XCircle,
  Play,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useBlockNumber, usePublicClient, useWalletClient, useAccount } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { HEAP_ABI, useTokenApproval } from '@ohara-ai/sdk'

interface HeapDetailsProps {
  contractAddress: `0x${string}` | undefined
  heapId: number
}

interface HeapData {
  token: string
  contributionAmount: bigint
  maxContributions: number
  contributors: string[]
  status: number
  winner: string
  createdAt: bigint
}

export function HeapDetails({ contractAddress, heapId }: HeapDetailsProps) {
  const [heap, setHeap] = useState<HeapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [contributePending, setContributePending] = useState(false)
  const [withdrawPending, setWithdrawPending] = useState(false)
  const [activatePending, setActivatePending] = useState(false)
  const [finalizePending, setFinalizePending] = useState(false)
  const [cancelPending, setCancelPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [winnerAddress, setWinnerAddress] = useState('')

  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Token approval for contributing
  const token = heap?.token || zeroAddress
  const contribution = heap?.contributionAmount || 0n
  const isNativeToken = token === zeroAddress

  const {
    needsApproval,
    approve,
    isApprovePending,
    isApproveConfirming,
  } = useTokenApproval({
    tokenAddress: token as `0x${string}`,
    spenderAddress: contractAddress || zeroAddress,
    amount: contribution,
    enabled: !!heap && !isNativeToken,
  })

  // Fetch heap details
  useEffect(() => {
    if (!contractAddress || !publicClient) {
      setHeap(null)
      setIsLoading(false)
      return
    }

    const fetchHeap = async () => {
      setIsLoading(true)
      try {
        const result = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'getHeap',
          args: [BigInt(heapId)],
        }) as [string, bigint, bigint, string[], number, string, bigint]

        const [tokenAddr, contributionAmount, maxContributions, contributors, status, winner, createdAt] = result
        setHeap({
          token: tokenAddr,
          contributionAmount,
          maxContributions: Number(maxContributions),
          contributors,
          status,
          winner,
          createdAt,
        })
        setError(null)
      } catch (err) {
        console.error('[HeapDetails] Error fetching heap:', err)
        setError('Failed to load heap details')
        setHeap(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHeap()
  }, [contractAddress, publicClient, heapId, blockNumber])

  const handleContribute = async () => {
    if (!contractAddress || !walletClient || !heap) return

    try {
      setContributePending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'contribute',
        args: [BigInt(heapId)],
        value: isNativeToken ? heap.contributionAmount : 0n,
      })

      await publicClient?.waitForTransactionReceipt({ hash })
    } catch (err) {
      console.error('[HeapDetails] Contribute error:', err)
      setError(err instanceof Error ? err.message : 'Failed to contribute')
    } finally {
      setContributePending(false)
    }
  }

  const handleWithdraw = async () => {
    if (!contractAddress || !walletClient) return

    try {
      setWithdrawPending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'withdraw',
        args: [BigInt(heapId)],
      })

      await publicClient?.waitForTransactionReceipt({ hash })
    } catch (err) {
      console.error('[HeapDetails] Withdraw error:', err)
      setError(err instanceof Error ? err.message : 'Failed to withdraw')
    } finally {
      setWithdrawPending(false)
    }
  }

  const handleActivate = async () => {
    if (!contractAddress) return

    try {
      setActivatePending(true)
      setError(null)

      const response = await fetch('/api/sdk/game/heap/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heapId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate heap')
      }
    } catch (err) {
      console.error('[HeapDetails] Activate error:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate')
    } finally {
      setActivatePending(false)
    }
  }

  const handleFinalize = async () => {
    if (!contractAddress || !winnerAddress) return

    try {
      setFinalizePending(true)
      setError(null)

      const response = await fetch('/api/sdk/game/heap/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heapId, winner: winnerAddress }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to finalize heap')
      }
    } catch (err) {
      console.error('[HeapDetails] Finalize error:', err)
      setError(err instanceof Error ? err.message : 'Failed to finalize')
    } finally {
      setFinalizePending(false)
    }
  }

  const handleCancel = async () => {
    if (!contractAddress) return

    try {
      setCancelPending(true)
      setError(null)

      const response = await fetch('/api/sdk/game/heap/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heapId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel heap')
      }
    } catch (err) {
      console.error('[HeapDetails] Cancel error:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setCancelPending(false)
    }
  }

  const getStatusBadge = (status: number) => {
    const statuses = ['Open', 'Active', 'Finalized', 'Cancelled']
    const colors = [
      'bg-green-500/10 text-green-500',
      'bg-blue-500/10 text-blue-500',
      'bg-gray-500/10 text-gray-500',
      'bg-red-500/10 text-red-500',
    ]
    return (
      <Badge className={colors[status] || colors[3]}>
        {statuses[status] || 'Unknown'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading heap details...</p>
        </CardContent>
      </Card>
    )
  }

  if (!heap) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Heap not found or deleted
        </CardContent>
      </Card>
    )
  }

  const isContributor = address && heap.contributors.includes(address)
  const canContribute = heap.status === 0 && heap.contributors.length < heap.maxContributions
  const canWithdraw = heap.status === 0 && isContributor
  const canActivate = heap.status === 0 && heap.contributors.length >= 1
  const canFinalize = heap.status === 1
  const canCancel = heap.status === 1

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Heap #{heapId}</CardTitle>
              <CardDescription>
                Created {new Date(Number(heap.createdAt) * 1000).toLocaleString()}
              </CardDescription>
            </div>
            {getStatusBadge(heap.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Contribution Amount</p>
              <div className="flex items-center gap-1">
                {isNativeToken ? (
                  <Banknote className="w-4 h-4 text-blue-500" />
                ) : (
                  <Coins className="w-4 h-4 text-purple-500" />
                )}
                <p className="font-semibold">
                  {formatEther(heap.contributionAmount)} {isNativeToken ? 'ETH' : 'Token'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contributors</p>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <p className="font-semibold">
                  {heap.contributors.length}/{heap.maxContributions}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Prize</p>
              <p className="font-semibold">
                {formatEther(heap.contributionAmount * BigInt(heap.contributors.length))} {isNativeToken ? 'ETH' : 'Token'}
              </p>
            </div>
            {heap.winner !== zeroAddress && (
              <div>
                <p className="text-sm text-muted-foreground">Winner</p>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <p className="font-semibold text-sm">
                    {heap.winner.slice(0, 6)}...{heap.winner.slice(-4)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contributors list */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Contributors</p>
            <div className="space-y-1">
              {heap.contributors.map((contributor, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4" />
                  <span className={contributor === address ? 'font-bold text-primary' : ''}>
                    {contributor.slice(0, 6)}...{contributor.slice(-4)}
                    {contributor === address && ' (You)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contributor actions */}
          {canContribute && (
            <div className="space-y-2">
              {!isNativeToken && needsApproval && (
                <Button
                  onClick={approve}
                  disabled={isApprovePending || isApproveConfirming}
                  variant="outline"
                  className="w-full"
                >
                  {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve Token'}
                </Button>
              )}
              <Button
                onClick={handleContribute}
                disabled={contributePending || (!isNativeToken && needsApproval)}
                className="w-full"
              >
                {contributePending ? 'Contributing...' : 'Contribute to Heap'}
              </Button>
            </div>
          )}

          {canWithdraw && (
            <Button
              onClick={handleWithdraw}
              disabled={withdrawPending}
              variant="outline"
              className="w-full"
            >
              {withdrawPending ? 'Withdrawing...' : 'Withdraw Contribution'}
            </Button>
          )}

          {/* Controller actions */}
          {canActivate && (
            <Button
              onClick={handleActivate}
              disabled={activatePending}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <Play className="w-4 h-4 mr-2" />
              {activatePending ? 'Activating...' : 'Activate Heap'}
            </Button>
          )}

          {canFinalize && (
            <div className="space-y-2">
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={winnerAddress}
                onChange={(e) => setWinnerAddress(e.target.value)}
              >
                <option value="">Select Winner</option>
                {heap.contributors.map((contributor) => (
                  <option key={contributor} value={contributor}>
                    {contributor.slice(0, 6)}...{contributor.slice(-4)}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleFinalize}
                disabled={finalizePending || !winnerAddress}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {finalizePending ? 'Finalizing...' : 'Finalize Heap'}
              </Button>
            </div>
          )}

          {canCancel && (
            <Button
              onClick={handleCancel}
              disabled={cancelPending}
              variant="destructive"
              className="w-full"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {cancelPending ? 'Cancelling...' : 'Cancel Heap'}
            </Button>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
