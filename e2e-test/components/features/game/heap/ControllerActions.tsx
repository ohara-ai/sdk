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
import {
  Settings,
  Trash2,
  UserPlus,
  UserMinus,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useWalletClient } from 'wagmi'
import { HEAP_ABI } from '@ohara-ai/sdk'

interface ControllerActionsProps {
  contractAddress: `0x${string}` | undefined
}

export function ControllerActions({ contractAddress }: ControllerActionsProps) {
  const { data: walletClient } = useWalletClient()

  const [setScorePending, setSetScorePending] = useState(false)
  const [setPredictionPending, setSetPredictionPending] = useState(false)
  const [registerSharePending, setRegisterSharePending] = useState(false)
  const [removeSharePending, setRemoveSharePending] = useState(false)
  const [setMaxHeapsPending, setSetMaxHeapsPending] = useState(false)
  const [cleanupPending, setCleanupPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [scoreAddress, setScoreAddress] = useState('')
  const [predictionAddress, setPredictionAddress] = useState('')
  const [shareRecipient, setShareRecipient] = useState('')
  const [shareBasisPoints, setShareBasisPoints] = useState('')
  const [removeRecipient, setRemoveRecipient] = useState('')
  const [maxActiveHeaps, setMaxActiveHeaps] = useState('')
  const [cleanupHeapId, setCleanupHeapId] = useState('')

  const showSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setTimeout(() => setSuccess(null), 5000)
  }

  const showError = (message: string) => {
    setError(message)
    setSuccess(null)
  }

  const handleSetScore = async () => {
    if (!contractAddress || !walletClient || !scoreAddress) return

    try {
      setSetScorePending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'setScore',
        args: [scoreAddress as `0x${string}`],
      })

      showSuccess(`Score contract set successfully! Tx: ${hash.slice(0, 10)}...`)
      setScoreAddress('')
    } catch (err) {
      console.error('[ControllerActions] Set score error:', err)
      showError(err instanceof Error ? err.message : 'Failed to set score contract')
    } finally {
      setSetScorePending(false)
    }
  }

  const handleSetPrediction = async () => {
    if (!contractAddress || !walletClient || !predictionAddress) return

    try {
      setSetPredictionPending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'setPrediction',
        args: [predictionAddress as `0x${string}`],
      })

      showSuccess(`Prediction contract set successfully! Tx: ${hash.slice(0, 10)}...`)
      setPredictionAddress('')
    } catch (err) {
      console.error('[ControllerActions] Set prediction error:', err)
      showError(err instanceof Error ? err.message : 'Failed to set prediction contract')
    } finally {
      setSetPredictionPending(false)
    }
  }

  const handleRegisterShareRecipient = async () => {
    if (!contractAddress || !walletClient || !shareRecipient || !shareBasisPoints) return

    try {
      setRegisterSharePending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'registerShareRecipient',
        args: [shareRecipient as `0x${string}`, BigInt(shareBasisPoints)],
      })

      showSuccess(`Share recipient registered! Tx: ${hash.slice(0, 10)}...`)
      setShareRecipient('')
      setShareBasisPoints('')
    } catch (err) {
      console.error('[ControllerActions] Register share recipient error:', err)
      showError(err instanceof Error ? err.message : 'Failed to register share recipient')
    } finally {
      setRegisterSharePending(false)
    }
  }

  const handleRemoveShareRecipient = async () => {
    if (!contractAddress || !walletClient || !removeRecipient) return

    try {
      setRemoveSharePending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'removeShareRecipient',
        args: [removeRecipient as `0x${string}`],
      })

      showSuccess(`Share recipient removed! Tx: ${hash.slice(0, 10)}...`)
      setRemoveRecipient('')
    } catch (err) {
      console.error('[ControllerActions] Remove share recipient error:', err)
      showError(err instanceof Error ? err.message : 'Failed to remove share recipient')
    } finally {
      setRemoveSharePending(false)
    }
  }

  const handleSetMaxActiveHeaps = async () => {
    if (!contractAddress || !walletClient || !maxActiveHeaps) return

    try {
      setSetMaxHeapsPending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'setMaxActiveHeaps',
        args: [BigInt(maxActiveHeaps)],
      })

      showSuccess(`Max active heaps updated! Tx: ${hash.slice(0, 10)}...`)
      setMaxActiveHeaps('')
    } catch (err) {
      console.error('[ControllerActions] Set max active heaps error:', err)
      showError(err instanceof Error ? err.message : 'Failed to set max active heaps')
    } finally {
      setSetMaxHeapsPending(false)
    }
  }

  const handleCleanupInactiveHeap = async () => {
    if (!contractAddress || !walletClient || !cleanupHeapId) return

    try {
      setCleanupPending(true)
      setError(null)

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: HEAP_ABI,
        functionName: 'cleanupInactiveHeap',
        args: [BigInt(cleanupHeapId)],
      })

      showSuccess(`Inactive heap cleaned up! Tx: ${hash.slice(0, 10)}...`)
      setCleanupHeapId('')
    } catch (err) {
      console.error('[ControllerActions] Cleanup inactive heap error:', err)
      showError(err instanceof Error ? err.message : 'Failed to cleanup inactive heap')
    } finally {
      setCleanupPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controller Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Controller Functions
          </CardTitle>
          <CardDescription>
            Configure contract integrations and share recipients (Controller only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set Score Contract */}
          <div className="space-y-2">
            <Label htmlFor="scoreAddress">Score Contract Address</Label>
            <div className="flex gap-2">
              <Input
                id="scoreAddress"
                placeholder="0x... (or 0x0 to disable)"
                value={scoreAddress}
                onChange={(e) => setScoreAddress(e.target.value)}
              />
              <Button
                onClick={handleSetScore}
                disabled={setScorePending || !scoreAddress}
                variant="controller"
                className="whitespace-nowrap"
              >
                {setScorePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Set Score'
                )}
              </Button>
            </div>
          </div>

          {/* Set Prediction Contract */}
          <div className="space-y-2">
            <Label htmlFor="predictionAddress">Prediction Contract Address</Label>
            <div className="flex gap-2">
              <Input
                id="predictionAddress"
                placeholder="0x... (or 0x0 to disable)"
                value={predictionAddress}
                onChange={(e) => setPredictionAddress(e.target.value)}
              />
              <Button
                onClick={handleSetPrediction}
                disabled={setPredictionPending || !predictionAddress}
                variant="controller"
                className="whitespace-nowrap"
              >
                {setPredictionPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Set Prediction'
                )}
              </Button>
            </div>
          </div>

          {/* Register Share Recipient */}
          <div className="space-y-2">
            <Label>Register Share Recipient</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Recipient address"
                value={shareRecipient}
                onChange={(e) => setShareRecipient(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Basis points (e.g., 1000 = 10%)"
                value={shareBasisPoints}
                onChange={(e) => setShareBasisPoints(e.target.value)}
                className="w-48"
              />
              <Button
                onClick={handleRegisterShareRecipient}
                disabled={registerSharePending || !shareRecipient || !shareBasisPoints}
                variant="controller"
                className="whitespace-nowrap"
              >
                {registerSharePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Register
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Max 5000 basis points (50%). 100 basis points = 1%
            </p>
          </div>

          {/* Remove Share Recipient */}
          <div className="space-y-2">
            <Label htmlFor="removeRecipient">Remove Share Recipient</Label>
            <div className="flex gap-2">
              <Input
                id="removeRecipient"
                placeholder="Recipient address to remove"
                value={removeRecipient}
                onChange={(e) => setRemoveRecipient(e.target.value)}
              />
              <Button
                onClick={handleRemoveShareRecipient}
                disabled={removeSharePending || !removeRecipient}
                variant="admin"
                className="whitespace-nowrap"
              >
                {removeSharePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Remove
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Functions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Owner Functions
          </CardTitle>
          <CardDescription>
            Manage contract capacity and cleanup (Owner only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Set Max Active Heaps */}
          <div className="space-y-2">
            <Label htmlFor="maxActiveHeaps">Max Active Heaps</Label>
            <div className="flex gap-2">
              <Input
                id="maxActiveHeaps"
                type="number"
                placeholder="e.g., 100 (0 = unlimited)"
                value={maxActiveHeaps}
                onChange={(e) => setMaxActiveHeaps(e.target.value)}
              />
              <Button
                onClick={handleSetMaxActiveHeaps}
                disabled={setMaxHeapsPending || !maxActiveHeaps}
                variant="controller"
                className="whitespace-nowrap"
              >
                {setMaxHeapsPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Update Limit'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum: 10,000 heaps. Set to 0 for unlimited.
            </p>
          </div>

          {/* Cleanup Inactive Heap */}
          <div className="space-y-2">
            <Label htmlFor="cleanupHeapId">Cleanup Inactive Heap</Label>
            <div className="flex gap-2">
              <Input
                id="cleanupHeapId"
                type="number"
                placeholder="Heap ID to cleanup"
                value={cleanupHeapId}
                onChange={(e) => setCleanupHeapId(e.target.value)}
              />
              <Button
                onClick={handleCleanupInactiveHeap}
                disabled={cleanupPending || !cleanupHeapId}
                variant="admin"
                className="whitespace-nowrap"
              >
                {cleanupPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Cleanup
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only works for Open heaps with no contributors
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        </div>
      )}
    </div>
  )
}
