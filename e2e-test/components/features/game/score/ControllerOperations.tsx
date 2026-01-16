'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Link2, Trophy, Loader2 } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { isAddress } from 'viem'

interface ControllerOperationsProps {
  contractAddress?: `0x${string}`
}

export function ControllerOperations({ contractAddress }: ControllerOperationsProps) {
  const { app } = useOharaAi()
  
  const [recorderAddress, setRecorderAddress] = useState('')
  const [recorderAuthorized, setRecorderAuthorized] = useState(true)
  const [prizeAddress, setPrizeAddress] = useState('')
  const [tournamentAddress, setTournamentAddress] = useState('')
  
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSetRecorderAuthorization = async () => {
    if (!contractAddress || !app.chainId) {
      setError('Missing required configuration')
      return
    }

    if (!isAddress(recorderAddress)) {
      setError('Invalid recorder address')
      return
    }

    setLoading('recorder')
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/sdk/controller/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: 'setRecorderAuthorization',
          params: {
            recorder: recorderAddress,
            authorized: recorderAuthorized,
          },
          chainId: app.chainId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set recorder authorization')
      }

      setSuccess(`Recorder authorization ${recorderAuthorized ? 'granted' : 'revoked'} successfully! TX: ${data.txHash.slice(0, 10)}...`)
      setRecorderAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set recorder authorization')
    } finally {
      setLoading(null)
    }
  }

  const handleSetPrize = async () => {
    if (!contractAddress || !app.chainId) {
      setError('Missing required configuration')
      return
    }

    if (prizeAddress && !isAddress(prizeAddress)) {
      setError('Invalid prize contract address')
      return
    }

    setLoading('prize')
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/sdk/controller/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: 'setPrize',
          params: {
            _prize: prizeAddress || '0x0000000000000000000000000000000000000000',
          },
          chainId: app.chainId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set prize contract')
      }

      setSuccess(`Prize contract updated successfully! TX: ${data.txHash.slice(0, 10)}...`)
      setPrizeAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set prize contract')
    } finally {
      setLoading(null)
    }
  }

  const handleSetTournament = async () => {
    if (!contractAddress || !app.chainId) {
      setError('Missing required configuration')
      return
    }

    if (tournamentAddress && !isAddress(tournamentAddress)) {
      setError('Invalid tournament contract address')
      return
    }

    setLoading('tournament')
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/sdk/controller/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          functionName: 'setTournament',
          params: {
            _tournament: tournamentAddress || '0x0000000000000000000000000000000000000000',
          },
          chainId: app.chainId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set tournament contract')
      }

      setSuccess(`Tournament contract updated successfully! TX: ${data.txHash.slice(0, 10)}...`)
      setTournamentAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set tournament contract')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Controller Operations
        </CardTitle>
        <CardDescription className="text-gray-600">
          Functions that can only be executed by the controller wallet
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

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Set Recorder Authorization
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="recorder-address" className="text-xs text-gray-700">
                  Recorder Address
                </Label>
                <Input
                  id="recorder-address"
                  type="text"
                  placeholder="0x..."
                  value={recorderAddress}
                  onChange={(e) => setRecorderAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recorder-authorized"
                  checked={recorderAuthorized}
                  onChange={(e) => setRecorderAuthorized(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="recorder-authorized" className="text-xs text-gray-700">
                  Authorized to record scores
                </Label>
              </div>
              <Button
                onClick={handleSetRecorderAuthorization}
                disabled={loading === 'recorder' || !recorderAddress}
                variant="controller"
                size="sm"
                className="w-full"
              >
                {loading === 'recorder' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Set Authorization'
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-600" />
              Set Prize Contract
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="prize-address" className="text-xs text-gray-700">
                  Prize Contract Address (empty to disable)
                </Label>
                <Input
                  id="prize-address"
                  type="text"
                  placeholder="0x... or leave empty"
                  value={prizeAddress}
                  onChange={(e) => setPrizeAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSetPrize}
                disabled={loading === 'prize'}
                variant="controller"
                size="sm"
                className="w-full"
              >
                {loading === 'prize' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Set Prize Contract'
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              Set Tournament Contract
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tournament-address" className="text-xs text-gray-700">
                  Tournament Contract Address (empty to disable)
                </Label>
                <Input
                  id="tournament-address"
                  type="text"
                  placeholder="0x... or leave empty"
                  value={tournamentAddress}
                  onChange={(e) => setTournamentAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSetTournament}
                disabled={loading === 'tournament'}
                variant="controller"
                size="sm"
                className="w-full"
              >
                {loading === 'tournament' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Set Tournament Contract'
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
