'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MatchList,
  CreateMatchForm,
  MatchDetails,
} from '@/components/features/game/match'
import { FeeWithdrawal } from '@/components/features/game/match/FeeWithdrawal'
import { MatchAdminActions } from '@/components/features/game/match/MatchAdminActions'
import { MatchOwnerSettings } from '@/components/features/game/match/MatchOwnerSettings'
import { ShareWithdrawal } from '@/components/features/game/match/ShareWithdrawal'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Swords, Trophy } from 'lucide-react'
import { useAccount, useBlockNumber } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'

export default function GameMatchPage() {
  const { isConnected } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('matches')

  const [feeConfig, setFeeConfig] = useState<{
    recipients: readonly `0x${string}`[]
    shares: readonly bigint[]
    totalShare: bigint
  } | null>(null)
  const [shareConfig, setShareConfig] = useState<{
    recipients: readonly `0x${string}`[]
    shares: readonly bigint[]
    totalShareBasisPoints: bigint
  } | null>(null)
  const [activeMatchCount, setActiveMatchCount] = useState<bigint | undefined>()
  const [maxActiveMatches, setMaxActiveMatches] = useState<bigint | undefined>()
  const [scoreboardAddress, setScoreboardAddress] = useState<`0x${string}` | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!game.match?.operations) return

    const fetchMatchData = async () => {
      try {
        const [feeConfigData, shareConfigData, activeCount, maxActive, scoreboardAddr] = await Promise.all([
          game.match.operations!.getFeeConfiguration(),
          game.match.operations!.getShareConfiguration(),
          game.match.operations!.getActiveMatchCount(),
          game.match.operations!.getMaxActiveMatches(),
          game.match.operations!.getScoreboardAddress(),
        ])

        setFeeConfig(feeConfigData)
        setShareConfig(shareConfigData)
        setActiveMatchCount(activeCount)
        setMaxActiveMatches(maxActive)
        setScoreboardAddress(scoreboardAddr)
      } catch (error) {
        console.error('[GameMatchPage] Error fetching match data:', error)
      }
    }

    fetchMatchData()
  }, [game.match?.operations, blockNumber])

  const feePercentage = feeConfig?.totalShare
    ? Number((feeConfig.totalShare * 100n) / 10000n)
    : undefined

  const sharePercentage = shareConfig?.totalShareBasisPoints
    ? Number((shareConfig.totalShareBasisPoints * 100n) / 10000n)
    : undefined

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="Game Match"
        description="Escrow-based match system with stake management"
        icon={<Swords className="w-5 h-5 text-purple-600" />}
        iconBg="bg-purple-100"
        contractAddress={game.match?.address}
        configItems={[
          { label: 'Total Fee', value: feePercentage !== undefined ? `${feePercentage}%` : undefined, highlight: true },
          { label: 'Fee Recipients', value: feeConfig?.recipients.length },
          { label: 'Total Share', value: sharePercentage !== undefined ? `${sharePercentage}%` : undefined, highlight: true },
          { label: 'Share Recipients', value: shareConfig?.recipients.length },
          { label: 'Active Matches', value: activeMatchCount?.toString(), highlight: true },
          { label: 'Max Concurrent', value: maxActiveMatches === 0n ? '∞' : maxActiveMatches?.toString() },
        ]}
        additionalContracts={[
          {
            label: 'Scoreboard Contract',
            address: scoreboardAddress,
            icon: <Trophy className="w-3 h-3 text-amber-600" />,
            iconBg: 'bg-amber-50',
          },
        ]}
      >
        <div className="space-y-4">
          {/* Fee Recipients Detail */}
          {feeConfig && feeConfig.recipients.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Fee Distribution
              </h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {feeConfig.recipients.map((recipient, idx) => {
                  const feeShare = feeConfig.shares[idx]
                  const feeSharePct = feeShare
                    ? Number((feeShare * 100n) / feeConfig.totalShare)
                    : 0
                  return (
                    <div
                      key={recipient}
                      className="flex items-center justify-between px-3 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="font-mono text-xs text-gray-700">
                          {recipient.slice(0, 8)}...{recipient.slice(-6)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-purple-600">
                        {feeSharePct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Share Recipients Detail */}
          {shareConfig && shareConfig.recipients.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Share Distribution
              </h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {shareConfig.recipients.map((recipient, idx) => {
                  const share = shareConfig.shares[idx]
                  const sharePct = share
                    ? Number((share * 100n) / shareConfig.totalShareBasisPoints)
                    : 0
                  return (
                    <div
                      key={recipient}
                      className="flex items-center justify-between px-3 py-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-mono text-xs text-gray-700">
                          {recipient.slice(0, 8)}...{recipient.slice(-6)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">
                        {sharePct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </FeaturePageHeader>

      {/* Content Section */}
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
                Please connect your wallet to interact with the Game Match
                feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
                  <TabsTrigger
                    value="matches"
                    className="data-[state=active]:bg-white"
                  >
                    Matches
                  </TabsTrigger>
                  <TabsTrigger
                    value="create"
                    className="data-[state=active]:bg-white"
                  >
                    Create Match
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin"
                    className="data-[state=active]:bg-white"
                  >
                    Admin
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="matches" className="mt-6">
                  <MatchList
                    onSelectMatch={setSelectedMatchId}
                    selectedMatchId={selectedMatchId}
                  />
                </TabsContent>
                <TabsContent value="create" className="mt-6">
                  <CreateMatchForm
                    onMatchCreated={(matchId) => {
                      console.log(
                        '[GameMatchPage] Match created, selecting match:',
                        matchId,
                      )
                      setSelectedMatchId(matchId)
                      setActiveTab('matches')
                    }}
                  />
                </TabsContent>
                <TabsContent value="admin" className="mt-6">
                  <div className="space-y-6">
                    <MatchAdminActions
                      matchId={selectedMatchId}
                      onActionComplete={() => {
                        // Refresh data after admin actions
                        console.log('[GameMatchPage] Admin action completed')
                      }}
                    />
                    <MatchOwnerSettings
                      onActionComplete={() => {
                        // Refresh data after owner actions
                        console.log('[GameMatchPage] Owner action completed')
                      }}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <MatchDetails
                matchId={selectedMatchId}
                onMatchDeleted={() => setSelectedMatchId(null)}
              />
              <FeeWithdrawal />
              <ShareWithdrawal />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
