'use client'

import { formatEther } from 'viem'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface PoolInfo {
  token: `0x${string}`
  matchesCompleted: bigint
  finalized: boolean
  prizeAmount: bigint
}

interface PoolWinners {
  winners: readonly `0x${string}`[]
  winCounts: readonly bigint[]
  claimed: readonly boolean[]
}

interface CurrentPoolProps {
  currentPoolId: bigint | undefined
  matchesPerPool: bigint | undefined
  poolInfo: PoolInfo | undefined
  poolWinners: PoolWinners | undefined
}

export function CurrentPool({ currentPoolId, matchesPerPool, poolInfo, poolWinners }: CurrentPoolProps) {
  const truncateAddress = (address: string) =>
    address === '0x0000000000000000000000000000000000000000'
      ? 'Native'
      : `${address.slice(0, 6)}...${address.slice(-4)}`

  const topWinner = poolWinners?.winners?.[0]
  const topWinCount = poolWinners?.winCounts?.[0]
  const allClaimed = poolWinners?.claimed?.every(c => c) ?? false

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Current Pool</CardTitle>
        <CardDescription className="text-gray-600">
          Live view of the current prize pool (multi-winner support)
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
          <span className="text-gray-600">Token</span>
          <span className="font-mono font-semibold text-xs">
            {poolInfo?.token ? truncateAddress(poolInfo.token) : '—'}
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
          <span className="text-gray-600">Prize Amount</span>
          <span className="font-mono font-semibold">
            {poolInfo?.prizeAmount ? `${formatEther(poolInfo.prizeAmount)} ETH` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Top Winner</span>
          <span className="font-mono font-semibold text-xs">
            {topWinner ? truncateAddress(topWinner) : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Top Wins</span>
          <span className="font-mono font-semibold">
            {topWinCount?.toString() ?? '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Winners Count</span>
          <span className="font-mono font-semibold">
            {poolWinners?.winners?.length?.toString() ?? '—'}
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
          <span className="text-gray-600">All Claimed</span>
          <span
            className={`font-mono font-semibold ${
              allClaimed ? 'text-amber-600' : 'text-gray-500'
            }`}
          >
            {poolWinners ? (allClaimed ? 'Yes' : 'No') : '—'}
          </span>
        </div>
      </div>
    </Card>
  )
}
