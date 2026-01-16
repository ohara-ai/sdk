'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CycleInfo,
  PlayerStats,
  Leaderboard,
  CycleConfig,
  CycleStatus,
  LeagueActions,
  CycleDetails,
  PlayerRankLookup,
} from '@/components/features/game/league'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Trophy, Swords } from 'lucide-react'
import { useAccount, useBlockNumber } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'
import { Address } from 'viem'

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as Address

interface Cycle {
  startTime: bigint
  endTime: bigint
  status: CycleStatus
}

interface PlayerStatsData {
  wins: bigint
  losses: bigint
  tokensWon: bigint
  rank: bigint
}

interface LeaderboardData {
  players: readonly `0x${string}`[]
  tokensWon: readonly bigint[]
}

export default function LeaguePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Extract league operations to avoid complex expression in dependency array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueOps = (game as any)?.league?.operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueAddress = (game as any)?.league?.address as string | undefined

  const [mounted, setMounted] = useState(false)
  const [currentCycleId, setCurrentCycleId] = useState<bigint | undefined>()
  const [cycle, setCycle] = useState<Cycle | undefined>()
  const [isCycleStarted, setIsCycleStarted] = useState<boolean | undefined>()
  const [playerStats, setPlayerStats] = useState<PlayerStatsData | undefined>()
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | undefined>()
  const [cycleDuration, setCycleDuration] = useState<bigint | undefined>()
  const [maxCyclesKept, setMaxCyclesKept] = useState<bigint | undefined>()
  const [cyclePlayerCount, setCyclePlayerCount] = useState<bigint | undefined>()
  const [cycleTokenCount, setCycleTokenCount] = useState<bigint | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!leagueOps) return

      try {
        const [cycleId, started, duration, maxCycles] = await Promise.all([
          leagueOps.getCurrentCycleId(),
          leagueOps.isCycleStarted(),
          leagueOps.getCycleDuration(),
          leagueOps.getMaxCyclesKept(),
        ])

        setCurrentCycleId(cycleId)
        setIsCycleStarted(started)
        setCycleDuration(duration)
        setMaxCyclesKept(maxCycles)

        if (started && cycleId > 0n) {
          const [cycleData, playerCount, tokenCount, leaderboardData] =
            await Promise.all([
              leagueOps.getCycle(cycleId),
              leagueOps.getCyclePlayerCount(cycleId),
              leagueOps.getCycleTokenCount(cycleId),
              leagueOps.getLeaderboard(cycleId, NATIVE_TOKEN, 10),
            ])

          setCycle(cycleData as Cycle)
          setCyclePlayerCount(playerCount)
          setCycleTokenCount(tokenCount)
          setLeaderboard(leaderboardData as LeaderboardData)

          if (userAddress) {
            const stats = await leagueOps.getPlayerStats(
              cycleId,
              userAddress,
              NATIVE_TOKEN,
            )
            setPlayerStats(stats as PlayerStatsData)
          }
        }
      } catch (error) {
        console.error('Error fetching league data:', error)
      }
    }

    fetchData()
  }, [leagueOps, userAddress, blockNumber])

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="League"
        description="Track cycle-based player rankings and leaderboards"
        icon={<Trophy className="w-5 h-5 text-blue-600" />}
        iconBg="bg-blue-100"
        contractAddress={leagueAddress}
        configItems={[
          {
            label: 'Current Cycle',
            value: currentCycleId?.toString(),
            highlight: true,
          },
          {
            label: 'Cycle Duration',
            value: cycleDuration
              ? `${Math.floor(Number(cycleDuration) / 3600)}h`
              : undefined,
          },
          {
            label: 'Players',
            value: cyclePlayerCount?.toString(),
            highlight: true,
          },
          {
            label: 'Tokens',
            value: cycleTokenCount?.toString(),
          },
          { label: 'Max Cycles Kept', value: maxCyclesKept?.toString() },
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
                Please connect your wallet to view League data
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Main Grid - Leaderboard and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main content - Leaderboard */}
              <div className="lg:col-span-3">
                <Leaderboard leaderboard={leaderboard} cycleId={currentCycleId} />
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <CycleInfo
                  currentCycleId={currentCycleId}
                  cycle={cycle}
                  isCycleStarted={isCycleStarted}
                />

                <PlayerStats
                  playerStats={playerStats}
                  cycleId={currentCycleId}
                />

                <CycleConfig
                  cycleDuration={cycleDuration}
                  maxCyclesKept={maxCyclesKept}
                  cyclePlayerCount={cyclePlayerCount}
                  cycleTokenCount={cycleTokenCount}
                />
              </div>
            </div>

            {/* Additional Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Admin Actions */}
              <div className="lg:col-span-1">
                <LeagueActions />
              </div>

              {/* Cycle Details */}
              <div className="lg:col-span-1">
                <CycleDetails cycleId={currentCycleId} />
              </div>

              {/* Player Rank Lookup */}
              <div className="lg:col-span-1">
                <PlayerRankLookup />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
