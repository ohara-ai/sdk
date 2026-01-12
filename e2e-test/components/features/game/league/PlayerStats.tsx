'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatEther } from 'viem'

interface PlayerStats {
  wins: bigint
  losses: bigint
  tokensWon: bigint
  rank: bigint
}

interface PlayerStatsProps {
  playerStats?: PlayerStats
  cycleId?: bigint
}

export function PlayerStats({ playerStats, cycleId }: PlayerStatsProps) {
  const hasStats = playerStats !== undefined

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          Your League Statistics
          {cycleId !== undefined && (
            <span className="text-xs text-gray-500 ml-2">
              (Cycle {cycleId.toString()})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasStats ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Wins</div>
              <div className="text-base font-bold text-green-600">
                {playerStats.wins.toString()}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Losses</div>
              <div className="text-base font-bold text-red-600">
                {playerStats.losses.toString()}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">
                Tokens Won
              </div>
              <div className="text-base font-bold text-gray-900">
                {formatEther(playerStats.tokensWon)} ETH
              </div>
            </div>
            {playerStats.rank > 0n && (
              <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded">
                <div className="text-xs font-medium text-blue-700">
                  Current Rank
                </div>
                <div className="text-base font-bold text-blue-700">
                  #{playerStats.rank.toString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs">No statistics available</p>
            <p className="text-xs mt-1 text-gray-400">
              Play matches to earn league rankings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
