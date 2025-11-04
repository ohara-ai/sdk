'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlayerStatsProps {
  playerScore?: readonly [bigint, bigint, bigint, bigint] // [totalWins, totalPrize, lastMatchId, lastWinTimestamp]
}

export function PlayerStats({ playerScore }: PlayerStatsProps) {
  const hasScore = playerScore !== undefined

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">Your Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {hasScore ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Total Wins</div>
              <div className="text-base font-bold text-gray-900">
                {playerScore[0].toString()}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Total Prize</div>
              <div className="text-base font-bold text-gray-900">
                {playerScore[1].toString()}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Last Match ID</div>
              <div className="text-sm font-bold text-gray-900">
                {playerScore[2].toString()}
              </div>
            </div>
            {playerScore[3] > 0n && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600">Last Win</div>
                <div className="text-xs font-medium text-gray-900">
                  {new Date(Number(playerScore[3]) * 1000).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs">No statistics available</p>
            <p className="text-xs mt-1 text-gray-400">Start playing to track your stats</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
