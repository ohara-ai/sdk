'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PoolInfo {
  matchesCompleted: bigint
  winner: `0x${string}`
  highestWins: bigint
  finalized: boolean
  prizeClaimed: boolean
}

interface CurrentPoolProps {
  currentPoolId: bigint | undefined
  matchesPerPool: bigint | undefined
  poolInfo: PoolInfo | undefined
}

export function CurrentPool({ currentPoolId, matchesPerPool, poolInfo }: CurrentPoolProps) {
  const truncateAddress = (address: string) =>
    address === '0x0000000000000000000000000000000000000000'
      ? 'None'
      : `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Current Pool</CardTitle>
        <CardDescription className="text-gray-600">
          Live view of the current prize pool
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Pool ID</span>
          <span className="font-mono font-semibold">
            {currentPoolId?.toString() ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Matches / Pool</span>
          <span className="font-mono font-semibold">
            {matchesPerPool?.toString() ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Matches Completed</span>
          <span className="font-mono font-semibold">
            {poolInfo?.matchesCompleted?.toString() ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Current Leader</span>
          <span className="font-mono font-semibold text-xs">
            {poolInfo?.winner ? truncateAddress(poolInfo.winner) : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Highest Wins</span>
          <span className="font-mono font-semibold">
            {poolInfo?.highestWins?.toString() ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Finalized</span>
          <span
            className={`font-mono font-semibold ${
              poolInfo?.finalized ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {poolInfo ? (poolInfo.finalized ? 'Yes' : 'No') : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Prize Claimed</span>
          <span
            className={`font-mono font-semibold ${
              poolInfo?.prizeClaimed ? 'text-amber-600' : 'text-gray-500'
            }`}
          >
            {poolInfo ? (poolInfo.prizeClaimed ? 'Yes' : 'No') : '—'}
          </span>
        </div>
      </div>
    </Card>
  )
}
