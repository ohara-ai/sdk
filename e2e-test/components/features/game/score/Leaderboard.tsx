'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LeaderboardProps {
  topPlayersByWins?: readonly [
    readonly `0x${string}`[], // players
    readonly bigint[],         // wins
    readonly bigint[]          // prizes
  ]
}

export function Leaderboard({ topPlayersByWins }: LeaderboardProps) {
  const hasPlayers = topPlayersByWins && topPlayersByWins[0].length > 0

  return (
    <Card className="border-2 border-gray-200 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Top Players</CardTitle>
        <CardDescription className="text-gray-600">
          Ranked by total wins
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasPlayers ? (
          <div className="space-y-2">
            {topPlayersByWins[0].map((player, index) => (
              <div 
                key={player} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-400 w-8">
                    #{index + 1}
                  </span>
                  <code className="text-xs font-mono text-gray-700">
                    {player.slice(0, 6)}...{player.slice(-4)}
                  </code>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Wins</div>
                    <div className="text-sm font-bold text-gray-900">
                      {topPlayersByWins[1][index].toString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Prize</div>
                    <div className="text-sm font-bold text-gray-900">
                      {topPlayersByWins[2][index].toString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No players yet</p>
            <p className="text-xs mt-2">Complete matches to populate the leaderboard</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
