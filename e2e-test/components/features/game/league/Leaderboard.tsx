'use client'

import { useMemo } from 'react'
import { formatEther } from 'viem'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Trophy } from 'lucide-react'

interface LeaderboardProps {
  leaderboard?: {
    players: readonly `0x${string}`[]
    tokensWon: readonly bigint[]
  }
  cycleId?: bigint
}

export function Leaderboard({ leaderboard, cycleId }: LeaderboardProps) {
  const hasPlayers = leaderboard && leaderboard.players.length > 0

  const sortedPlayers = useMemo(() => {
    if (!hasPlayers) return null

    const combined = leaderboard.players.map((player, idx) => ({
      player,
      tokensWon: leaderboard.tokensWon[idx],
    }))

    combined.sort((a, b) => {
      const diff = b.tokensWon - a.tokensWon
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })

    return combined
  }, [leaderboard, hasPlayers])

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 0:
        return 'text-yellow-500'
      case 1:
        return 'text-gray-400'
      case 2:
        return 'text-amber-600'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              League Leaderboard
            </CardTitle>
            <CardDescription className="text-gray-600">
              {cycleId !== undefined
                ? `Cycle ${cycleId.toString()} Rankings`
                : 'Current cycle rankings'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedPlayers ? (
          <div className="space-y-2">
            {sortedPlayers.map((item, index) => (
              <div
                key={item.player}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-lg font-bold w-8 ${getMedalColor(index)}`}
                  >
                    #{index + 1}
                  </span>
                  <code className="text-xs font-mono text-gray-700">
                    {item.player.slice(0, 6)}...{item.player.slice(-4)}
                  </code>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Tokens Won</div>
                  <div className="text-sm font-bold text-gray-900">
                    {parseFloat(formatEther(item.tokensWon)).toFixed(4)} ETH
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No players in this cycle yet</p>
            <p className="text-xs mt-2">
              Complete matches to appear on the leaderboard
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
