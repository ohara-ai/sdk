'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ContractStatsProps {
  totalMatches?: bigint
  totalPlayers?: bigint
}

export function ContractStats({ totalMatches, totalPlayers }: ContractStatsProps) {
  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Contract Statistics</CardTitle>
        <CardDescription className="text-gray-600">
          Overall contract metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-600">Total Matches</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalMatches !== undefined ? totalMatches.toString() : '—'}
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-600">Total Players</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalPlayers !== undefined ? totalPlayers.toString() : '—'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
