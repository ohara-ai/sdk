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
import { useOharaAi, type MarketSummary } from '@ohara-ai/sdk'
import { Target, ChevronRight, Users, Coins } from 'lucide-react'
import { formatEther } from 'viem'

interface MarketListProps {
  onSelectMarket?: (marketId: bigint) => void
}

export function MarketList({ onSelectMarket }: MarketListProps) {
  const { game } = useOharaAi()
  const [markets, setMarkets] = useState<{ id: bigint; summary: MarketSummary }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMarkets = async () => {
      if (!game.prediction?.operations) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const nextId = await game.prediction.operations.getNextMarketId()
        const marketData: { id: bigint; summary: MarketSummary }[] = []

        // Fetch last 10 markets (or all if less than 10)
        const startId = nextId > 10n ? nextId - 10n : 1n
        for (let id = startId; id < nextId; id++) {
          try {
            const summary = await game.prediction.operations.getMarketSummary(id)
            marketData.push({ id, summary })
          } catch {
            // Market doesn't exist, skip
          }
        }

        setMarkets(marketData.reverse()) // Show newest first
      } catch (err) {
        console.error('Error fetching markets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [game.prediction?.operations])

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Prediction Markets</CardTitle>
          <CardDescription>Loading markets...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (markets.length === 0) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Prediction Markets</CardTitle>
          <CardDescription>No markets created yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Prediction Markets</CardTitle>
        <CardDescription>Active and resolved prediction markets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {markets.map(({ id, summary }) => (
            <div
              key={id.toString()}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Target className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    Market #{id.toString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-3 h-3" />
                    {summary.predictorCount.toString()} predictors
                    <span className="text-gray-400">•</span>
                    <Coins className="w-3 h-3" />
                    {formatEther(summary.totalPool)} ETH
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={summary.resolved ? 'secondary' : summary.bettingOpen ? 'default' : 'outline'}
                >
                  {summary.resolved ? 'Resolved' : summary.bettingOpen ? 'Open' : 'Closed'}
                </Badge>
                {onSelectMarket && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectMarket(id)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
