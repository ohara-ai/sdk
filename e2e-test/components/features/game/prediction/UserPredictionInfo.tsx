'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOharaAi } from '@ohara-ai/sdk'
import { useAccount } from 'wagmi'
import { User, TrendingUp, Lock, CheckCircle, XCircle } from 'lucide-react'
import { formatEther } from 'viem'

interface UserPredictionInfoProps {
  marketId: bigint
}

export function UserPredictionInfo({ marketId }: UserPredictionInfoProps) {
  const { game } = useOharaAi()
  const { address } = useAccount()
  const [loading, setLoading] = useState(true)
  const [prediction, setPrediction] = useState<{
    predictedPlayer: string
    amount: bigint
    claimed: boolean
  } | null>(null)
  const [commitData, setCommitData] = useState<{
    commitHash: string
    amount: bigint
    commitTime: bigint
    revealed: boolean
  } | null>(null)
  const [potentialPayout, setPotentialPayout] = useState<bigint | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!game.prediction?.operations || !address) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const operations = game.prediction.operations as any

        const [pred, commit, payout, correct] = await Promise.all([
          operations.getPrediction(marketId, address).catch(() => null),
          operations.getCommit(marketId, address).catch(() => null),
          operations.getPotentialPayout(marketId, address).catch(() => 0n),
          operations.isPredictionCorrect(marketId, address).catch(() => null),
        ])

        if (pred && pred.amount > 0n) {
          setPrediction(pred)
          setPotentialPayout(payout)
          setIsCorrect(correct)
        }

        if (commit && commit.amount > 0n) {
          setCommitData(commit)
        }
      } catch (err) {
        console.error('Error fetching user prediction data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [game.prediction?.operations, marketId, address])

  if (!address) {
    return null
  }

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Your Prediction</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!prediction && !commitData) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            Your Prediction
          </CardTitle>
          <CardDescription>No prediction placed yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Your Prediction
        </CardTitle>
        <CardDescription className="text-gray-600">
          Your stake and potential winnings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Commit Data */}
        {commitData && (
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Lock className="w-4 h-4 text-blue-600" />
                Commit Status
              </div>
              <Badge variant={commitData.revealed ? 'default' : 'secondary'}>
                {commitData.revealed ? 'Revealed' : 'Unrevealed'}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{formatEther(commitData.amount)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Commit Hash:</span>
                <span className="font-mono text-xs">
                  {commitData.commitHash.slice(0, 10)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Commit Time:</span>
                <span className="text-xs">
                  {new Date(Number(commitData.commitTime) * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Prediction Data */}
        {prediction && (
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Prediction Details
              </div>
              {isCorrect !== null && (
                <Badge variant={isCorrect ? 'default' : 'destructive'}>
                  {isCorrect ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Incorrect
                    </>
                  )}
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Predicted Player:</span>
                <span className="font-mono text-xs">
                  {prediction.predictedPlayer.slice(0, 6)}...
                  {prediction.predictedPlayer.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Staked:</span>
                <span className="font-medium">{formatEther(prediction.amount)} ETH</span>
              </div>
              {potentialPayout !== null && potentialPayout > 0n && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Potential Payout:</span>
                  <span className="font-medium text-green-600">
                    {formatEther(potentialPayout)} ETH
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Claimed:</span>
                <Badge variant={prediction.claimed ? 'default' : 'outline'}>
                  {prediction.claimed ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
