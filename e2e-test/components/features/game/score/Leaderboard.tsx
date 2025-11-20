'use client'

import { useState, useMemo } from 'react'
import { formatEther } from 'viem'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Coins } from 'lucide-react'

interface LeaderboardProps {
  topPlayersByWins?: readonly [
    readonly `0x${string}`[], // players
    readonly bigint[], // wins
    readonly bigint[], // prizes
  ]
}

export function Leaderboard({ topPlayersByWins }: LeaderboardProps) {
  const [rankBy, setRankBy] = useState<'wins' | 'prize'>('wins')
  const hasPlayers = topPlayersByWins && topPlayersByWins[0].length > 0

  // Sort players based on selected ranking
  const sortedPlayers = useMemo(() => {
    if (!hasPlayers) return null

    const players = topPlayersByWins[0]
    const wins = topPlayersByWins[1]
    const prizes = topPlayersByWins[2]

    const combined = players.map((player, idx) => ({
      player,
      wins: wins[idx],
      prize: prizes[idx],
    }))

    combined.sort((a, b) => {
      if (rankBy === 'wins') {
        return Number(b.wins - a.wins)
      } else {
        return Number(b.prize - a.prize)
      }
    })

    return combined
  }, [topPlayersByWins, rankBy, hasPlayers])

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Players
            </CardTitle>
            <CardDescription className="text-gray-600">
              Ranked by {rankBy === 'wins' ? 'total wins' : 'prize pool'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={rankBy === 'wins' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRankBy('wins')}
              className="flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              Wins
            </Button>
            <Button
              variant={rankBy === 'prize' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRankBy('prize')}
              className="flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              Prize
            </Button>
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
                  <span className="text-lg font-bold text-gray-400 w-8">
                    #{index + 1}
                  </span>
                  <code className="text-xs font-mono text-gray-700">
                    {item.player.slice(0, 6)}...{item.player.slice(-4)}
                  </code>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Wins</div>
                    <div className="text-sm font-bold text-gray-900">
                      {item.wins.toString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Prize</div>
                    <div className="text-sm font-bold text-gray-900">
                      {parseFloat(formatEther(item.prize)).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No players yet</p>
            <p className="text-xs mt-2">
              Complete matches to populate the leaderboard
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
