'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  PredictionContractInformation,
  MarketList,
  MarketDetails,
  ControllerActions,
  UserActions,
  UserPredictionInfo,
} from '@/components/features/game/prediction'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Target, Swords } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'

export default function PredictionPage() {
  const { isConnected } = useAccount()
  const { game } = useOharaAi()

  const [selectedMarketId, setSelectedMarketId] = useState<bigint | null>(null)
  const [mounted, setMounted] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useState(() => {
    setMounted(true)
  })

  const handleActionComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-white">
      <FeaturePageHeader
        title="Prediction Markets"
        description="Bet on match outcomes and claim winnings"
        icon={<Target className="w-5 h-5 text-cyan-600" />}
        iconBg="bg-cyan-100"
        contractAddress={game.prediction?.address}
        configItems={[
          { label: 'Market Type', value: 'Match' },
          { label: 'Token', value: 'Native ETH' },
        ]}
        additionalContracts={[
          {
            label: 'Match Contract',
            address: game.match?.address,
            icon: <Swords className="w-3 h-3 text-purple-600" />,
            iconBg: 'bg-purple-50',
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!mounted ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Loading...</CardTitle>
              <CardDescription className="text-gray-600">
                Initializing application
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !isConnected ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Connect Wallet</CardTitle>
              <CardDescription className="text-gray-600">
                Please connect your wallet to view prediction markets
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <PredictionContractInformation
              contractAddress={game.prediction?.address}
            />

            <ControllerActions contractAddress={game.prediction?.address} />

            {selectedMarketId ? (
              <div className="space-y-6">
                <MarketDetails
                  marketId={selectedMarketId}
                  onBack={() => setSelectedMarketId(null)}
                />
                <UserPredictionInfo marketId={selectedMarketId} key={`info-${refreshKey}`} />
                <UserActions 
                  marketId={selectedMarketId} 
                  onActionComplete={handleActionComplete}
                />
              </div>
            ) : (
              <MarketList onSelectMarket={setSelectedMarketId} key={`list-${refreshKey}`} />
            )}
          </div>
        )}
      </div>
    </main>
  )
}
