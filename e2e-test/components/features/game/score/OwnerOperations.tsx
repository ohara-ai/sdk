'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Loader2 } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'

interface OwnerOperationsProps {
  contractAddress?: `0x${string}`
  currentMaxLosersPerMatch?: bigint
  currentMaxTotalPlayers?: bigint
  currentMaxTotalMatches?: bigint
}

export function OwnerOperations({
  contractAddress,
  currentMaxLosersPerMatch,
  currentMaxTotalPlayers,
  currentMaxTotalMatches,
}: OwnerOperationsProps) {
  const { app } = useOharaAi()
  
  const [maxLosersPerMatch, setMaxLosersPerMatch] = useState('')
  const [maxTotalPlayers, setMaxTotalPlayers] = useState('')
  const [maxTotalMatches, setMaxTotalMatches] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpdateLimits = async () => {
    if (!contractAddress || !app.chainId) {
      setError('Missing required configuration')
      return
    }

    const losers = maxLosersPerMatch ? parseInt(maxLosersPerMatch) : 0
    const players = maxTotalPlayers ? parseInt(maxTotalPlayers) : 0
    const matches = maxTotalMatches ? parseInt(maxTotalMatches) : 0

    if (losers < 0 || players < 0 || matches < 0) {
      setError('Values must be non-negative')
      return
    }

    if (losers === 0 && players === 0 && matches === 0) {
      setError('At least one limit must be specified')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/sdk/controller/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: 'updateLimits',
          params: {
            _maxLosersPerMatch: losers.toString(),
            _maxTotalPlayers: players.toString(),
            _maxTotalMatches: matches.toString(),
          },
          chainId: app.chainId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update limits')
      }

      setSuccess(`Limits updated successfully! TX: ${data.txHash.slice(0, 10)}...`)
      setMaxLosersPerMatch('')
      setMaxTotalPlayers('')
      setMaxTotalMatches('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update limits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-600" />
          Owner Operations
        </CardTitle>
        <CardDescription className="text-gray-600">
          Functions that can only be executed by the contract owner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-600" />
            Update Storage Limits
          </h4>
          <p className="text-xs text-gray-600 mb-4">
            Leave fields empty (or set to 0) to keep current values. New values must be greater than or equal to current usage.
          </p>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="max-losers" className="text-xs text-gray-700">
                Max Losers Per Match
                {currentMaxLosersPerMatch !== undefined && (
                  <span className="ml-2 text-gray-500">(current: {currentMaxLosersPerMatch.toString()})</span>
                )}
              </Label>
              <Input
                id="max-losers"
                type="number"
                min="0"
                placeholder="Leave empty to keep current"
                value={maxLosersPerMatch}
                onChange={(e) => setMaxLosersPerMatch(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max-players" className="text-xs text-gray-700">
                Max Total Players
                {currentMaxTotalPlayers !== undefined && (
                  <span className="ml-2 text-gray-500">(current: {currentMaxTotalPlayers.toString()})</span>
                )}
              </Label>
              <Input
                id="max-players"
                type="number"
                min="0"
                placeholder="Leave empty to keep current"
                value={maxTotalPlayers}
                onChange={(e) => setMaxTotalPlayers(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max-matches" className="text-xs text-gray-700">
                Max Total Matches
                {currentMaxTotalMatches !== undefined && (
                  <span className="ml-2 text-gray-500">(current: {currentMaxTotalMatches.toString()})</span>
                )}
              </Label>
              <Input
                id="max-matches"
                type="number"
                min="0"
                placeholder="Leave empty to keep current"
                value={maxTotalMatches}
                onChange={(e) => setMaxTotalMatches(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleUpdateLimits}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Update Limits'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
