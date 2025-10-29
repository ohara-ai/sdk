'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlayerStatsProps {
  playerScore?: readonly [bigint, bigint, bigint, bigint] // [totalWins, totalPrize, lastMatchId, lastWinTimestamp]
}

export function PlayerStats({ playerScore }: PlayerStatsProps) {
  const hasScore = playerScore !== undefined

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Your Statistics</CardTitle>
        <CardDescription className="text-gray-600">
          Your personal performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasScore ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-600">Total Wins</div>
              <div className="text-2xl font-bold text-gray-900">
                {playerScore[0].toString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-600">Total Prize</div>
              <div className="text-2xl font-bold text-gray-900">
                {playerScore[1].toString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-600">Last Match ID</div>
              <div className="text-xl font-bold text-gray-900">
                {playerScore[2].toString()}
              </div>
            </div>
            {playerScore[3] > 0n && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-600">Last Win</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(Number(playerScore[3]) * 1000).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No statistics available</p>
            <p className="text-xs mt-2">Start playing to track your stats</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
