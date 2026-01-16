'use client'

import { useState, useEffect } from 'react'
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
  Settings,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Percent,
} from 'lucide-react'
import { useAccount, useWalletClient, useBlockNumber } from 'wagmi'
import { isAddress } from 'viem'
import { useOharaAi } from '@ohara-ai/sdk'

interface MatchOwnerSettingsProps {
  onActionComplete?: () => void
}

export function MatchOwnerSettings({
  onActionComplete,
}: MatchOwnerSettingsProps) {
  const { address } = useAccount()
  const { status: walletStatus } = useWalletClient()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const isWalletReady = walletStatus === 'success'

  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Current settings
  const [maxActiveMatches, setMaxActiveMatches] = useState<bigint | undefined>()
  const [activeMatchCount, setActiveMatchCount] = useState<bigint | undefined>()

  // Set Max Active Matches
  const [newMaxActiveMatches, setNewMaxActiveMatches] = useState('')

  // Cleanup Inactive Match
  const [cleanupMatchId, setCleanupMatchId] = useState('')

  // Configure Fees
  const [feeRecipients, setFeeRecipients] = useState<string[]>([''])
  const [feeShares, setFeeShares] = useState<string[]>([''])

  // Fetch current settings
  useEffect(() => {
    if (!game.match?.operations) return

    const fetchSettings = async () => {
      try {
        const [maxActive, activeCount] = await Promise.all([
          game.match.operations!.getMaxActiveMatches(),
          game.match.operations!.getActiveMatchCount(),
        ])
        setMaxActiveMatches(maxActive)
        setActiveMatchCount(activeCount)
      } catch (error) {
        console.error('[MatchOwnerSettings] Error fetching settings:', error)
      }
    }

    fetchSettings()
  }, [game.match?.operations, blockNumber])

  const resetMessages = () => {
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleSetMaxActiveMatches = async () => {
    const newMax = parseInt(newMaxActiveMatches)
    if (isNaN(newMax) || newMax < 0) {
      setErrorMessage('Please enter a valid number (0 for unlimited)')
      return
    }

    if (newMax > 10000) {
      setErrorMessage('Maximum limit is 10000')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/set-max-active-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxActiveMatches: newMax,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update max active matches')
      }

      setSuccessMessage(
        `Max active matches updated to ${newMax === 0 ? 'unlimited' : newMax}!`,
      )
      setNewMaxActiveMatches('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCleanupInactiveMatch = async () => {
    if (!cleanupMatchId) {
      setErrorMessage('Please enter a match ID')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/cleanup-inactive-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: parseInt(cleanupMatchId),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup match')
      }

      setSuccessMessage(`Match ${cleanupMatchId} cleaned up successfully!`)
      setCleanupMatchId('')
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfigureFees = async () => {
    // Validate recipients
    const validRecipients = feeRecipients.filter((r) => r.trim() !== '')
    if (validRecipients.length === 0) {
      setErrorMessage('Please add at least one fee recipient')
      return
    }

    for (const recipient of validRecipients) {
      if (!isAddress(recipient)) {
        setErrorMessage(`Invalid address: ${recipient}`)
        return
      }
    }

    // Validate shares
    const validShares = feeShares.slice(0, validRecipients.length)
    const shareValues = validShares.map((s) => parseInt(s))

    if (shareValues.some((s) => isNaN(s) || s <= 0)) {
      setErrorMessage('All shares must be positive numbers')
      return
    }

    const totalShare = shareValues.reduce((sum, s) => sum + s, 0)
    if (totalShare > 10000) {
      setErrorMessage('Total fee share cannot exceed 10000 (100%)')
      return
    }

    setIsProcessing(true)
    resetMessages()

    try {
      const response = await fetch('/api/sdk/game/match/configure-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: validRecipients,
          shares: shareValues,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to configure fees')
      }

      setSuccessMessage(
        `Fee configuration updated! Total: ${totalShare / 100}%`,
      )
      setFeeRecipients([''])
      setFeeShares([''])
      onActionComplete?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrorMessage(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const addFeeRecipient = () => {
    setFeeRecipients([...feeRecipients, ''])
    setFeeShares([...feeShares, ''])
  }

  const removeFeeRecipient = (index: number) => {
    setFeeRecipients(feeRecipients.filter((_, i) => i !== index))
    setFeeShares(feeShares.filter((_, i) => i !== index))
  }

  const updateFeeRecipient = (index: number, value: string) => {
    const newRecipients = [...feeRecipients]
    newRecipients[index] = value
    setFeeRecipients(newRecipients)
  }

  const updateFeeShare = (index: number, value: string) => {
    const newShares = [...feeShares]
    newShares[index] = value
    setFeeShares(newShares)
  }

  if (!address) {
    return null
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Owner Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Contract configuration and maintenance
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-700 border-amber-300"
          >
            Owner
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Settings Display */}
        <div className="p-3 bg-white rounded-lg border space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            Current Settings
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Max Active Matches:</span>
              <p className="font-semibold">
                {maxActiveMatches === 0n
                  ? '∞ (Unlimited)'
                  : maxActiveMatches?.toString() || 'Loading...'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Active Matches:</span>
              <p className="font-semibold">
                {activeMatchCount?.toString() || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Set Max Active Matches */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(activeAction === 'setMax' ? null : 'setMax')
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-blue-200 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Set Max Active Matches
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'setMax' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'setMax' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newMaxActiveMatches" className="text-xs">
                  Max Active Matches
                </Label>
                <Input
                  id="newMaxActiveMatches"
                  type="number"
                  placeholder="Enter limit (0 for unlimited)"
                  value={newMaxActiveMatches}
                  onChange={(e) => setNewMaxActiveMatches(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-gray-500">
                  Current: {maxActiveMatches === 0n ? '∞' : maxActiveMatches?.toString()}
                  {' | '}Max: 10000
                </p>
              </div>
              <Button
                onClick={handleSetMaxActiveMatches}
                disabled={isProcessing || !isWalletReady}
                className="w-full"
                size="sm"
              >
                {isProcessing ? 'Updating...' : 'Update Limit'}
              </Button>
            </div>
          )}
        </div>

        {/* Cleanup Inactive Match */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(activeAction === 'cleanup' ? null : 'cleanup')
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-orange-200 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">
                Cleanup Inactive Match
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'cleanup' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'cleanup' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cleanupMatchId" className="text-xs">
                  Match ID
                </Label>
                <Input
                  id="cleanupMatchId"
                  type="number"
                  placeholder="Enter match ID"
                  value={cleanupMatchId}
                  onChange={(e) => setCleanupMatchId(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-gray-500">
                  Only works for Open matches with no players
                </p>
              </div>
              <Button
                onClick={handleCleanupInactiveMatch}
                disabled={isProcessing || !isWalletReady}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                {isProcessing ? 'Cleaning up...' : 'Cleanup Match'}
              </Button>
            </div>
          )}
        </div>

        {/* Configure Fees */}
        <div className="space-y-2">
          <button
            onClick={() =>
              setActiveAction(
                activeAction === 'configureFees' ? null : 'configureFees',
              )
            }
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white border-2 border-purple-200 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                Configure Fees
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {activeAction === 'configureFees' ? '▼' : '▶'}
            </span>
          </button>
          {activeAction === 'configureFees' && (
            <div className="p-3 bg-white rounded-lg border space-y-3">
              <div className="space-y-3">
                {feeRecipients.map((recipient, index) => (
                  <div key={index} className="space-y-2 p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Recipient {index + 1}</Label>
                      {feeRecipients.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeeRecipient(index)}
                          className="h-6 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) =>
                        updateFeeRecipient(index, e.target.value)
                      }
                      className="h-8 font-mono text-xs"
                    />
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Share (basis points, 100 = 1%)
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500 for 5%"
                        value={feeShares[index]}
                        onChange={(e) => updateFeeShare(index, e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addFeeRecipient}
                className="w-full"
                disabled={feeRecipients.length >= 10}
              >
                + Add Recipient
              </Button>
              <p className="text-xs text-gray-500">
                Total fee cannot exceed 10000 (100%). Max 10 recipients.
              </p>
              <Button
                onClick={handleConfigureFees}
                disabled={isProcessing || !isWalletReady}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                {isProcessing ? 'Configuring...' : 'Configure Fees'}
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
        <div className="pt-3 border-t border-amber-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> These actions require owner permissions.
            Configure fees to set up revenue sharing for the contract.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
