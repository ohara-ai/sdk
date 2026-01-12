'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export enum CycleStatus {
  Registration = 0,
  Active = 1,
  Finalized = 2,
}

interface Cycle {
  startTime: bigint
  endTime: bigint
  status: CycleStatus
}

interface CycleInfoProps {
  currentCycleId?: bigint
  cycle?: Cycle
  isCycleStarted?: boolean
}

function getStatusLabel(status: CycleStatus): string {
  switch (status) {
    case CycleStatus.Registration:
      return 'Registration'
    case CycleStatus.Active:
      return 'Active'
    case CycleStatus.Finalized:
      return 'Finalized'
    default:
      return 'Unknown'
  }
}

function getStatusColor(status: CycleStatus): string {
  switch (status) {
    case CycleStatus.Registration:
      return 'bg-yellow-100 text-yellow-800'
    case CycleStatus.Active:
      return 'bg-green-100 text-green-800'
    case CycleStatus.Finalized:
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function CycleInfo({ currentCycleId, cycle, isCycleStarted }: CycleInfoProps) {
  const hasData = currentCycleId !== undefined

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">
          Current Cycle
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Cycle ID</div>
              <div className="text-base font-bold text-gray-900">
                {currentCycleId.toString()}
              </div>
            </div>

            {cycle && (
              <>
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="text-xs font-medium text-gray-600">Status</div>
                  <Badge className={getStatusColor(cycle.status)}>
                    {getStatusLabel(cycle.status)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="text-xs font-medium text-gray-600">Start Time</div>
                  <div className="text-xs font-medium text-gray-900">
                    {new Date(Number(cycle.startTime) * 1000).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="text-xs font-medium text-gray-600">End Time</div>
                  <div className="text-xs font-medium text-gray-900">
                    {new Date(Number(cycle.endTime) * 1000).toLocaleString()}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-600">Cycle Started</div>
              <div className="text-sm font-bold text-gray-900">
                {isCycleStarted ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-xs">No cycle information available</p>
            <p className="text-xs mt-1 text-gray-400">
              League not yet initialized
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
