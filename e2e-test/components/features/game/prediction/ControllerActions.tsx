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
import { useOharaAi, type ServerPredictionOperations } from '@ohara-ai/sdk'
import { Shield, Lock, Plus, AlertCircle } from 'lucide-react'

interface ControllerActionsProps {
  contractAddress?: string
}

export function ControllerActions({ contractAddress }: ControllerActionsProps) {
  const { game } = useOharaAi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create Market state
  const [competitionType, setCompetitionType] = useState<string>('0')
  const [competitionId, setCompetitionId] = useState<string>('')
  const [tokenAddress, setTokenAddress] = useState<string>('0x0000000000000000000000000000000000000000')

  // Close Betting state
  const [marketIdToClose, setMarketIdToClose] = useState<string>('')

  const handleCreateMarket = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    if (!competitionId) {
      setError('Please enter a competition ID')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations
      
      if (!operations.createMarket) {
        setError('createMarket function not available. Server operations required.')
        return
      }

      const txHash = await operations.createMarket(
        parseInt(competitionType),
        BigInt(competitionId),
        tokenAddress as `0x${string}`,
      )

      setSuccess(`Market created! TX: ${txHash.slice(0, 10)}...`)
      setCompetitionId('')
    } catch (err) {
      console.error('Error creating market:', err)
      setError(err instanceof Error ? err.message : 'Failed to create market')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseBetting = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    if (!marketIdToClose) {
      setError('Please enter a market ID')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations
      
      if (!operations.closeBetting) {
        setError('closeBetting function not available. Server operations required.')
        return
      }

      const txHash = await operations.closeBetting(BigInt(marketIdToClose))

      setSuccess(`Betting closed! TX: ${txHash.slice(0, 10)}...`)
      setMarketIdToClose('')
    } catch (err) {
      console.error('Error closing betting:', err)
      setError(err instanceof Error ? err.message : 'Failed to close betting')
    } finally {
      setLoading(false)
    }
  }

  if (!contractAddress) {
    return null
  }

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Controller Actions
        </CardTitle>
        <CardDescription className="text-gray-600">
          Admin functions (requires controller wallet)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Market */}
        <div className="space-y-3 p-4 bg-white rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Plus className="w-4 h-4 text-purple-600" />
            Create Market
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="competitionType">Competition Type</Label>
              <select
                id="competitionType"
                value={competitionType}
                onChange={(e) => setCompetitionType(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2"
              >
                <option value="0">Match</option>
                <option value="1">Tournament</option>
                <option value="2">League Cycle</option>
              </select>
            </div>
            <div>
              <Label htmlFor="competitionId">Competition ID</Label>
              <Input
                id="competitionId"
                type="number"
                placeholder="1"
                value={competitionId}
                onChange={(e) => setCompetitionId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tokenAddress">Token Address (0x0 for native)</Label>
              <Input
                id="tokenAddress"
                placeholder="0x0000000000000000000000000000000000000000"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button
              onClick={handleCreateMarket}
              disabled={loading}
              variant="controller"
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Market'}
            </Button>
          </div>
        </div>

        {/* Close Betting */}
        <div className="space-y-3 p-4 bg-white rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Lock className="w-4 h-4 text-purple-600" />
            Close Betting
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="marketIdToClose">Market ID</Label>
              <Input
                id="marketIdToClose"
                type="number"
                placeholder="1"
                value={marketIdToClose}
                onChange={(e) => setMarketIdToClose(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCloseBetting}
              disabled={loading}
              variant="controller"
              className="w-full"
            >
              {loading ? 'Closing...' : 'Close Betting'}
            </Button>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            {success}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
