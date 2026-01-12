'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOharaAi } from '@ohara-ai/sdk'
import { Target, Users, Coins, Trophy, ArrowLeft } from 'lucide-react'
import { formatEther } from 'viem'

interface MarketDetailsProps {
  marketId: bigint
  onBack?: () => void
}

export function MarketDetails({ marketId, onBack }: MarketDetailsProps) {
  const { game } = useOharaAi()
  const [market, setMarket] = useState<{
    competitionType: number
    competitionId: bigint
    totalPool: bigint
    predictorCount: bigint
    uniquePlayersCount: bigint
    bettingOpen: boolean
    resolved: boolean
    resolvedWinner: string
  } | null>(null)
  const [odds, setOdds] = useState<
    { player: string; totalStaked: bigint; odds: bigint }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMarketDetails = async () => {
      if (!game.prediction?.operations) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [summary, allOdds] = await Promise.all([
          game.prediction.operations.getMarketSummary(marketId),
          game.prediction.operations.getAllOdds(marketId),
        ])

        setMarket(summary)
        setOdds(allOdds)
      } catch (err) {
        console.error('Error fetching market details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketDetails()
  }, [game.prediction?.operations, marketId])

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Market #{marketId.toString()}
          </CardTitle>
          <CardDescription>Loading market details...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!market) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Market Not Found</CardTitle>
          <CardDescription>
            Market #{marketId.toString()} does not exist
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const competitionTypes = ['Match', 'Tournament', 'League Cycle']

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-600" />
                Market #{marketId.toString()}
              </CardTitle>
              <CardDescription>
                {competitionTypes[market.competitionType] || 'Unknown'} #
                {market.competitionId.toString()}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              market.resolved
                ? 'secondary'
                : market.bettingOpen
                  ? 'default'
                  : 'outline'
            }
          >
            {market.resolved
              ? 'Resolved'
              : market.bettingOpen
                ? 'Betting Open'
                : 'Betting Closed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Coins className="w-4 h-4 text-amber-600" />}
            label="Total Pool"
            value={`${formatEther(market.totalPool)} ETH`}
          />
          <StatCard
            icon={<Users className="w-4 h-4 text-purple-600" />}
            label="Predictors"
            value={market.predictorCount.toString()}
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-blue-600" />}
            label="Players"
            value={market.uniquePlayersCount.toString()}
          />
          {market.resolved && (
            <StatCard
              icon={<Trophy className="w-4 h-4 text-green-600" />}
              label="Winner"
              value={`${market.resolvedWinner.slice(0, 6)}...`}
            />
          )}
        </div>

        {odds.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Current Odds
            </h3>
            <div className="space-y-2">
              {odds.map((playerOdds, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="font-mono text-sm">
                    {playerOdds.player.slice(0, 10)}...
                    {playerOdds.player.slice(-8)}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {formatEther(playerOdds.totalStaked)} ETH staked
                    </span>
                    <Badge variant="outline">
                      {(Number(playerOdds.odds) / 10000).toFixed(2)}x
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}
