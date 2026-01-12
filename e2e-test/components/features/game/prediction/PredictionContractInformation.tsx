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
import { TrendingUp, Users, Target, Coins } from 'lucide-react'

interface PredictionContractInformationProps {
  contractAddress?: string
}

export function PredictionContractInformation({
  contractAddress,
}: PredictionContractInformationProps) {
  const { game } = useOharaAi()
  const [nextMarketId, setNextMarketId] = useState<bigint | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!game.prediction?.operations) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const marketId = await game.prediction.operations.getNextMarketId()
        setNextMarketId(marketId)
      } catch (err) {
        console.error('Error fetching prediction data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [game.prediction?.operations])

  if (!contractAddress) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600" />
            Prediction Contract
          </CardTitle>
          <CardDescription className="text-gray-600">
            No prediction contract deployed
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600" />
            Prediction Contract
          </CardTitle>
          <CardDescription className="text-gray-600">
            Loading contract data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600" />
            Prediction Contract
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalMarkets = nextMarketId ? Number(nextMarketId) - 1 : 0

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-600" />
              Prediction Contract
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Prediction market contract statistics
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-cyan-600" />}
            label="Total Markets"
            value={totalMarkets.toString()}
            highlight
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-blue-600" />}
            label="Next Market ID"
            value={nextMarketId?.toString() || '1'}
          />
          <StatCard
            icon={<Users className="w-4 h-4 text-purple-600" />}
            label="Market Type"
            value="Match"
          />
          <StatCard
            icon={<Coins className="w-4 h-4 text-amber-600" />}
            label="Token"
            value="Native"
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}

function StatCard({ icon, label, value, highlight }: StatCardProps) {
  return (
    <div
      className={`p-3 rounded-lg ${highlight ? 'bg-cyan-50 border border-cyan-200' : 'bg-gray-50'}`}
    >
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-xl font-semibold ${highlight ? 'text-cyan-700' : 'text-gray-900'}`}
      >
        {value}
      </div>
    </div>
  )
}
