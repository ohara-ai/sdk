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
  PlayerStats,
  Leaderboard,
} from '@/components/features/game/score'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Trophy, Swords } from 'lucide-react'
import { useAccount, useBlockNumber } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'

export default function GameScorePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [mounted, setMounted] = useState(false)
  const [playerScore, setPlayerScore] =
    useState<readonly [bigint, bigint, bigint, bigint]>()
  const [topPlayersByWins, setTopPlayersByWins] =
    useState<
      readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[]]
    >()

  const [maxLosersPerMatch, setMaxLosersPerMatch] = useState<bigint | undefined>()
  const [maxTotalPlayers, setMaxTotalPlayers] = useState<bigint | undefined>()
  const [maxTotalMatches, setMaxTotalMatches] = useState<bigint | undefined>()
  const [totalPlayers, setTotalPlayers] = useState<bigint | undefined>()
  const [totalMatches, setTotalMatches] = useState<bigint | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!game.scores.operations) return

      try {
        const [top, maxLosers, maxPlayers, maxMatches, players, matches] = await Promise.all([
          game.scores.operations.getTopPlayersByWins(10),
          game.scores.operations.getMaxLosersPerMatch(),
          game.scores.operations.getMaxTotalPlayers(),
          game.scores.operations.getMaxTotalMatches(),
          game.scores.operations.getTotalPlayers(),
          game.scores.operations.getTotalMatches(),
        ])

        setTopPlayersByWins([top.players, top.wins, top.prizes])
        setMaxLosersPerMatch(maxLosers)
        setMaxTotalPlayers(maxPlayers)
        setMaxTotalMatches(maxMatches)
        setTotalPlayers(players)
        setTotalMatches(matches)

        if (userAddress) {
          const score = await game.scores.operations.getPlayerScore(userAddress)
          setPlayerScore([
            score.totalWins,
            score.totalPrize,
            score.lastMatchId,
            score.lastWinTimestamp,
          ])
        }
      } catch (error) {
        console.error('Error fetching score data:', error)
      }
    }

    fetchData()
  }, [game.scores.operations, userAddress, blockNumber])

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="Game Score"
        description="Track player scores, wins, and match history"
        icon={<Trophy className="w-5 h-5 text-amber-600" />}
        iconBg="bg-amber-100"
        contractAddress={game.scores?.address}
        configItems={[
          { label: 'Max Losers/Match', value: maxLosersPerMatch?.toString() },
          { label: 'Total Players', value: totalPlayers?.toString(), highlight: true },
          { label: 'Max Players', value: maxTotalPlayers?.toString() },
          { label: 'Total Matches', value: totalMatches?.toString(), highlight: true },
          { label: 'Max Matches', value: maxTotalMatches?.toString() },
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
                Please connect your wallet to view GameScore data
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Leaderboard topPlayersByWins={topPlayersByWins} />
            </div>

            <div className="lg:col-span-1">
              <PlayerStats playerScore={playerScore} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
