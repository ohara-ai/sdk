'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Trophy, Target, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { isAddress } from 'viem'

/**
 * Component for tournament admin settings (Score and Prediction contract configuration)
 */
export function TournamentAdminSettings() {
  const { game } = useOharaAi()
  const [scoreAddress, setScoreAddress] = useState('')
  const [predictionAddress, setPredictionAddress] = useState('')
  const [currentScoreAddress, setCurrentScoreAddress] = useState<string>('')
  const [isSettingScore, setIsSettingScore] = useState(false)
  const [isSettingPrediction, setIsSettingPrediction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentAddresses = async () => {
      if (!game.tournament?.operations) {
        setLoading(false)
        return
      }

      try {
        const score = await game.tournament.operations.getScoreContract()
        setCurrentScoreAddress(score)
        setScoreAddress(score)
      } catch (err) {
        console.error('Error fetching current addresses:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentAddresses()
  }, [game.tournament?.operations])

  const handleSetScoreContract = async () => {
    setError(null)
    setSuccess(null)

    if (!scoreAddress) {
      setError('Score contract address is required')
      return
    }

    if (!isAddress(scoreAddress)) {
      setError('Invalid score contract address')
      return
    }

    try {
      setIsSettingScore(true)

      const response = await fetch('/api/sdk/game/tournament/set-score-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreAddress }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set score contract')
      }

      setSuccess(`Score contract updated! TX: ${data.txHash.slice(0, 10)}...`)
      setCurrentScoreAddress(scoreAddress)
    } catch (err: any) {
      console.error('Error setting score contract:', err)
      setError(err.message || 'Failed to set score contract')
    } finally {
      setIsSettingScore(false)
    }
  }

  const handleSetPrediction = async () => {
    setError(null)
    setSuccess(null)

    if (!predictionAddress) {
      setError('Prediction contract address is required')
      return
    }

    if (!isAddress(predictionAddress)) {
      setError('Invalid prediction contract address')
      return
    }

    try {
      setIsSettingPrediction(true)

      const response = await fetch('/api/sdk/game/tournament/set-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionAddress }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set prediction contract')
      }

      setSuccess(`Prediction contract updated! TX: ${data.txHash.slice(0, 10)}...`)
      setPredictionAddress('')
    } catch (err: any) {
      console.error('Error setting prediction contract:', err)
      setError(err.message || 'Failed to set prediction contract')
    } finally {
      setIsSettingPrediction(false)
    }
  }

  const useCurrentScore = () => {
    if (game.scores?.address) {
      setScoreAddress(game.scores.address)
    }
  }

  const useCurrentPrediction = () => {
    if (game.prediction?.address) {
      setPredictionAddress(game.prediction.address)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Admin Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Score Contract */}
          {!loading && currentScoreAddress && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Current Score Contract:
              </p>
              <p className="text-xs font-mono text-gray-600 break-all">
                {currentScoreAddress}
              </p>
            </div>
          )}

          {/* Set Score Contract */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <Label className="text-sm font-semibold text-gray-900">
                Set Score Contract
              </Label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              The Score contract tracks match results and automatically resolves
              tournament bracket matches.
            </div>
            <div className="space-y-2">
              <Input
                placeholder="0x..."
                value={scoreAddress}
                onChange={(e) => setScoreAddress(e.target.value)}
                className="text-xs font-mono"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useCurrentScore}
                  disabled={!game.scores?.address}
                  className="flex-1 h-8 text-xs"
                >
                  Use Deployed Score
                </Button>
                <Button
                  onClick={handleSetScoreContract}
                  disabled={isSettingScore || !scoreAddress}
                  className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSettingScore ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    'Set Score Contract'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Set Prediction Contract */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <Label className="text-sm font-semibold text-gray-900">
                Set Prediction Contract
              </Label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              The Prediction contract enables betting on tournaments. When set,
              betting automatically closes when a tournament is activated.
            </div>
            <div className="space-y-2">
              <Input
                placeholder="0x... (or 0x0 to disable)"
                value={predictionAddress}
                onChange={(e) => setPredictionAddress(e.target.value)}
                className="text-xs font-mono"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useCurrentPrediction}
                  disabled={!game.prediction?.address}
                  className="flex-1 h-8 text-xs"
                >
                  Use Deployed Prediction
                </Button>
                <Button
                  onClick={handleSetPrediction}
                  disabled={isSettingPrediction || !predictionAddress}
                  className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSettingPrediction ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    'Set Prediction Contract'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
