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
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Link2,
  UserPlus,
  UserMinus,
} from 'lucide-react'
import { useAccount, useWalletClient } from 'wagmi'
import { isAddress } from 'viem'

interface MatchAdminActionsProps {
  matchId: number | null
  onActionComplete?: () => void
}

export function MatchAdminActions({
  matchId: _matchId,
  onActionComplete,
}: MatchAdminActionsProps) {
  const { address } = useAccount()
  const { status: walletStatus } = useWalletClient()
  const isWalletReady = walletStatus === 'success'

  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Cancel Match
  const [cancelMatchId, setCancelMatchId] = useState('')

  // Set Score Contract
  const [scoreAddress, setScoreAddress] = useState('')

  // Set Prediction Contract
  const [predictionAddress, setPredictionAddress] = useState('')

  // Register Share Recipient
  const [shareRecipient, setShareRecipient] = useState('')
  const [shareBasisPoints, setShareBasisPoints] = useState('')

  // Remove Share Recipient
  const [removeRecipient, setRemoveRecipient] = useState('')

  const resetMessages = () => {
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleCancelMatch = async () => {
    if (!cancelMatchId) {
      setErrorMessage('Please enter a match ID')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: parseInt(cancelMatchId),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel match')
      }

      setSuccessMessage(`Match ${cancelMatchId} cancelled successfully!`)
      setCancelMatchId('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSetScore = async () => {
    if (!scoreAddress || !isAddress(scoreAddress)) {
      setErrorMessage('Please enter a valid address')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/set-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set score contract')
      }

      setSuccessMessage('Score contract updated successfully!')
      setScoreAddress('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSetPrediction = async () => {
    if (!predictionAddress || !isAddress(predictionAddress)) {
      setErrorMessage('Please enter a valid address')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/set-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set prediction contract')
      }

      setSuccessMessage('Prediction contract updated successfully!')
      setPredictionAddress('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRegisterShareRecipient = async () => {
    if (!shareRecipient || !isAddress(shareRecipient)) {
      setErrorMessage('Please enter a valid recipient address')
      return
    }

    const bps = parseInt(shareBasisPoints)
    if (isNaN(bps) || bps <= 0 || bps > 5000) {
      setErrorMessage('Basis points must be between 1 and 5000 (0.01% to 50%)')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/register-share-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: shareRecipient,
          shareBasisPoints: bps,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register share recipient')
      }

      setSuccessMessage(`Share recipient registered with ${bps / 100}% share!`)
      setShareRecipient('')
      setShareBasisPoints('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveShareRecipient = async () => {
    if (!removeRecipient || !isAddress(removeRecipient)) {
      setErrorMessage('Please enter a valid recipient address')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/remove-share-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: removeRecipient,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove share recipient')
      }

      setSuccessMessage('Share recipient removed successfully!')
      setRemoveRecipient('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!address) {
    return null
  }

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Controller Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Administrative functions for app controller
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-indigo-100 text-indigo-700 border-indigo-300"
          >
            Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cancel Match */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(activeAction === 'cancel' ? null : 'cancel')
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-red-200 hover:border-red-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-gray-900">
                Cancel Match
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'cancel' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'cancel' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cancelMatchId" className="text-xs">
                  Match ID
                </Label>
                <Input
                  id="cancelMatchId"
                  type="number"
                  placeholder="Enter match ID"
                  value={cancelMatchId}
                  onChange={(e) => setCancelMatchId(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                onClick={handleCancelMatch}
                disabled={isProcessing || !isWalletReady}
                variant="admin"
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Match'}
              </Button>
            </div>
          )}
        </div>

        {/* Set Score Contract */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(activeAction === 'setScore' ? null : 'setScore')
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-blue-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Set Score Contract
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'setScore' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'setScore' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="scoreAddress" className="text-xs">
                  Score Contract Address
                </Label>
                <Input
                  id="scoreAddress"
                  type="text"
                  placeholder="0x..."
                  value={scoreAddress}
                  onChange={(e) => setScoreAddress(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Use 0x0000000000000000000000000000000000000000 to disable
                </p>
              </div>
              <Button
                onClick={handleSetScore}
                disabled={isProcessing || !isWalletReady}
                variant="controller"
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Updating...' : 'Update Score Contract'}
              </Button>
            </div>
          )}
        </div>

        {/* Set Prediction Contract */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(
                activeAction === 'setPrediction' ? null : 'setPrediction',
              )
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-blue-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Set Prediction Contract
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'setPrediction' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'setPrediction' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="predictionAddress" className="text-xs">
                  Prediction Contract Address
                </Label>
                <Input
                  id="predictionAddress"
                  type="text"
                  placeholder="0x..."
                  value={predictionAddress}
                  onChange={(e) => setPredictionAddress(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Use 0x0000000000000000000000000000000000000000 to disable
                </p>
              </div>
              <Button
                onClick={handleSetPrediction}
                disabled={isProcessing || !isWalletReady}
                variant="controller"
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Updating...' : 'Update Prediction Contract'}
              </Button>
            </div>
          )}
        </div>

        {/* Register Share Recipient */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(
                activeAction === 'registerShare' ? null : 'registerShare',
              )
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-green-200 hover:border-green-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">
                Register Share Recipient
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'registerShare' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'registerShare' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="shareRecipient" className="text-xs">
                  Recipient Address
                </Label>
                <Input
                  id="shareRecipient"
                  type="text"
                  placeholder="0x..."
                  value={shareRecipient}
                  onChange={(e) => setShareRecipient(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shareBasisPoints" className="text-xs">
                  Share Basis Points (100 = 1%)
                </Label>
                <Input
                  id="shareBasisPoints"
                  type="number"
                  placeholder="e.g., 1000 for 10%"
                  value={shareBasisPoints}
                  onChange={(e) => setShareBasisPoints(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-gray-500">
                  Max: 5000 (50%). Total shares cannot exceed 50%.
                </p>
              </div>
              <Button
                onClick={handleRegisterShareRecipient}
                disabled={isProcessing || !isWalletReady}
                variant="controller"
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Registering...' : 'Register Recipient'}
              </Button>
            </div>
          )}
        </div>

        {/* Remove Share Recipient */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(
                activeAction === 'removeShare' ? null : 'removeShare',
              )
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-orange-200 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">
                Remove Share Recipient
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'removeShare' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'removeShare' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="removeRecipient" className="text-xs">
                  Recipient Address
                </Label>
                <Input
                  id="removeRecipient"
                  type="text"
                  placeholder="0x..."
                  value={removeRecipient}
                  onChange={(e) => setRemoveRecipient(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </div>
              <Button
                onClick={handleRemoveShareRecipient}
                disabled={isProcessing || !isWalletReady}
                variant="admin"
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Removing...' : 'Remove Recipient'}
              </Button>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-500 font-medium">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-500">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="pt-3 border-t border-indigo-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> These actions require controller permissions.
            Share recipients (e.g., Prize contract) receive a percentage of
            match winnings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
