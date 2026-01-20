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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOharaAi, type ServerPredictionOperations } from '@ohara-ai/sdk'
import { User, Lock, Eye, Trophy, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { parseEther } from 'viem'

interface UserActionsProps {
  marketId: bigint
  onActionComplete?: () => void
}

export function UserActions({ marketId, onActionComplete }: UserActionsProps) {
  const { game } = useOharaAi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Commit state
  const [commitPlayer, setCommitPlayer] = useState<string>('')
  const [commitAmount, setCommitAmount] = useState<string>('0.01')
  const [commitSalt, setCommitSalt] = useState<string>('')

  // Reveal state
  const [revealPlayer, setRevealPlayer] = useState<string>('')
  const [revealSalt, setRevealSalt] = useState<string>('')

  // Direct predict state
  const [predictPlayer, setPredictPlayer] = useState<string>('')
  const [predictAmount, setPredictAmount] = useState<string>('0.01')

  const generateRandomSalt = () => {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const salt = '0x' + Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    setCommitSalt(salt)
    setSuccess('Random salt generated!')
  }

  const handleCommit = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    if (!commitPlayer || !commitSalt) {
      setError('Please enter player address and salt')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations
      
      const commitHash = operations.generateCommitHash(
        commitPlayer as `0x${string}`,
        commitSalt as `0x${string}`,
      )

      const txHash = await operations.commit(
        marketId,
        commitHash,
        parseEther(commitAmount),
      )

      setSuccess(`Committed! TX: ${txHash.slice(0, 10)}... Save your salt: ${commitSalt}`)
      onActionComplete?.()
    } catch (err) {
      console.error('Error committing:', err)
      setError(err instanceof Error ? err.message : 'Failed to commit')
    } finally {
      setLoading(false)
    }
  }

  const handleReveal = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    if (!revealPlayer || !revealSalt) {
      setError('Please enter player address and salt')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations

      const txHash = await operations.reveal(
        marketId,
        revealPlayer as `0x${string}`,
        revealSalt as `0x${string}`,
      )

      setSuccess(`Revealed! TX: ${txHash.slice(0, 10)}...`)
      setRevealPlayer('')
      setRevealSalt('')
      onActionComplete?.()
    } catch (err) {
      console.error('Error revealing:', err)
      setError(err instanceof Error ? err.message : 'Failed to reveal')
    } finally {
      setLoading(false)
    }
  }

  const handlePredict = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    if (!predictPlayer) {
      setError('Please enter player address')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations

      const txHash = await operations.predict(
        marketId,
        predictPlayer as `0x${string}`,
        parseEther(predictAmount),
      )

      setSuccess(`Predicted! TX: ${txHash.slice(0, 10)}...`)
      setPredictPlayer('')
      onActionComplete?.()
    } catch (err) {
      console.error('Error predicting:', err)
      setError(err instanceof Error ? err.message : 'Failed to predict')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations

      const txHash = await operations.claim(marketId)

      setSuccess(`Claimed! TX: ${txHash.slice(0, 10)}...`)
      onActionComplete?.()
    } catch (err) {
      console.error('Error claiming:', err)
      setError(err instanceof Error ? err.message : 'Failed to claim')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimRefund = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations

      const txHash = await operations.claimRefund(marketId)

      setSuccess(`Refund claimed! TX: ${txHash.slice(0, 10)}...`)
      onActionComplete?.()
    } catch (err) {
      console.error('Error claiming refund:', err)
      setError(err instanceof Error ? err.message : 'Failed to claim refund')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    setError(null)
    setSuccess(null)

    if (!game.prediction?.operations) {
      setError('Prediction contract not available')
      return
    }

    try {
      setLoading(true)
      const operations = game.prediction.operations as ServerPredictionOperations

      const txHash = await operations.resolve(marketId)

      setSuccess(`Market resolved! TX: ${txHash.slice(0, 10)}...`)
      onActionComplete?.()
    } catch (err) {
      console.error('Error resolving:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          User Actions
        </CardTitle>
        <CardDescription className="text-gray-600">
          Place predictions and claim winnings for Market #{marketId.toString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="commit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commit">Commit</TabsTrigger>
            <TabsTrigger value="reveal">Reveal</TabsTrigger>
            <TabsTrigger value="predict">Direct</TabsTrigger>
          </TabsList>

          {/* Commit Tab */}
          <TabsContent value="commit" className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Lock className="w-4 h-4 text-blue-600" />
                Commit Prediction (Phase 1)
              </div>
              <div>
                <Label htmlFor="commitPlayer">Player Address</Label>
                <Input
                  id="commitPlayer"
                  placeholder="0x..."
                  value={commitPlayer}
                  onChange={(e) => setCommitPlayer(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="commitAmount">Amount (ETH)</Label>
                <Input
                  id="commitAmount"
                  type="number"
                  step="0.001"
                  value={commitAmount}
                  onChange={(e) => setCommitAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="commitSalt">Salt (keep this secret!)</Label>
                <div className="flex gap-2">
                  <Input
                    id="commitSalt"
                    placeholder="0x..."
                    value={commitSalt}
                    onChange={(e) => setCommitSalt(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button onClick={generateRandomSalt} variant="outline" size="sm">
                    Generate
                  </Button>
                </div>
              </div>
              <Button onClick={handleCommit} disabled={loading} variant="user" className="w-full">
                {loading ? 'Committing...' : 'Commit Prediction'}
              </Button>
            </div>
          </TabsContent>

          {/* Reveal Tab */}
          <TabsContent value="reveal" className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Eye className="w-4 h-4 text-blue-600" />
                Reveal Prediction (Phase 2)
              </div>
              <div>
                <Label htmlFor="revealPlayer">Player Address</Label>
                <Input
                  id="revealPlayer"
                  placeholder="0x..."
                  value={revealPlayer}
                  onChange={(e) => setRevealPlayer(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="revealSalt">Salt (from commit)</Label>
                <Input
                  id="revealSalt"
                  placeholder="0x..."
                  value={revealSalt}
                  onChange={(e) => setRevealSalt(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={handleReveal} disabled={loading} variant="user" className="w-full">
                {loading ? 'Revealing...' : 'Reveal Prediction'}
              </Button>
            </div>
          </TabsContent>

          {/* Direct Predict Tab */}
          <TabsContent value="predict" className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Trophy className="w-4 h-4 text-blue-600" />
                Direct Prediction (Legacy)
              </div>
              <div>
                <Label htmlFor="predictPlayer">Player Address</Label>
                <Input
                  id="predictPlayer"
                  placeholder="0x..."
                  value={predictPlayer}
                  onChange={(e) => setPredictPlayer(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="predictAmount">Amount (ETH)</Label>
                <Input
                  id="predictAmount"
                  type="number"
                  step="0.001"
                  value={predictAmount}
                  onChange={(e) => setPredictAmount(e.target.value)}
                />
              </div>
              <Button onClick={handlePredict} disabled={loading} variant="user" className="w-full">
                {loading ? 'Predicting...' : 'Place Prediction'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Claim Actions */}
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleClaim}
              disabled={loading}
              variant="user"
              className="w-full"
            >
              <Trophy className="w-4 h-4 mr-2" />
              {loading ? 'Claiming...' : 'Claim Winnings'}
            </Button>
            <Button
              onClick={handleClaimRefund}
              disabled={loading}
              variant="user"
              className="w-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {loading ? 'Claiming...' : 'Claim Refund'}
            </Button>
          </div>
          <Button
            onClick={handleResolve}
            disabled={loading}
            variant="user"
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Resolving...' : 'Resolve Market'}
          </Button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            {success}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
