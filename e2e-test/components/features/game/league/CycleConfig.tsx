'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface CycleConfigProps {
  cycleDuration?: bigint
  maxCyclesKept?: bigint
  cyclePlayerCount?: bigint
  cycleTokenCount?: bigint
}

function formatDuration(seconds: bigint): string {
  const sec = Number(seconds)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

export function CycleConfig({
  cycleDuration,
  maxCyclesKept,
  cyclePlayerCount,
  cycleTokenCount,
}: CycleConfigProps) {
  const hasConfig = cycleDuration !== undefined

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          League Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasConfig ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">
                Cycle Duration
              </div>
              <div className="text-sm font-bold text-gray-900">
                {formatDuration(cycleDuration)}
              </div>
            </div>

            {maxCyclesKept !== undefined && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600">
                  Max Cycles Kept
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {maxCyclesKept.toString()}
                </div>
              </div>
            )}

            {cyclePlayerCount !== undefined && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600">
                  Players This Cycle
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {cyclePlayerCount.toString()}
                </div>
              </div>
            )}

            {cycleTokenCount !== undefined && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="text-xs font-medium text-gray-600">
                  Tokens This Cycle
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {cycleTokenCount.toString()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs">No configuration available</p>
            <p className="text-xs mt-1 text-gray-400">
              League not yet deployed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
