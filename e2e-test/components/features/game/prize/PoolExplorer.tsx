'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import { formatEther } from 'viem'

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

interface PoolExplorerProps {
  totalPoolCount: bigint | undefined
  tokens: readonly `0x${string}`[]
  onGetPool: (poolId: bigint) => Promise<PoolInfo>
  onGetPoolWinners: (poolId: bigint) => Promise<PoolWinners>
}

export function PoolExplorer({
  totalPoolCount,
  tokens,
  onGetPool,
  onGetPoolWinners,
}: PoolExplorerProps) {
  const [poolId, setPoolId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null)
  const [poolWinners, setPoolWinners] = useState<PoolWinners | null>(null)

  const truncateAddress = (address: string) =>
    address === '0x0000000000000000000000000000000000000000'
      ? 'Native'
      : `${address.slice(0, 6)}...${address.slice(-4)}`

  const handleSearch = async () => {
    if (!poolId) return
    setIsLoading(true)
    setError(null)
    setPoolInfo(null)
    setPoolWinners(null)
    try {
      const [info, winners] = await Promise.all([
        onGetPool(BigInt(poolId)),
        onGetPoolWinners(BigInt(poolId)),
      ])
      setPoolInfo(info)
      setPoolWinners(winners)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch pool data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-teal-600" />
          <CardTitle className="text-gray-900">Pool Explorer</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Query any pool by ID to view details and winners
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">
        {/* Stats */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Pools Created</span>
            <span className="font-mono font-semibold">{totalPoolCount?.toString() ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tracked Tokens</span>
            <span className="font-mono font-semibold">{tokens.length}</span>
          </div>
        </div>

        {/* Token List */}
        {tokens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600 font-medium">Tracked Tokens</div>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token) => (
                <code
                  key={token}
                  className="text-xs font-mono bg-gray-50 border border-gray-200 px-2 py-1 rounded"
                >
                  {truncateAddress(token)}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="poolId" className="text-xs text-gray-700">
            Pool ID
          </Label>
          <div className="flex gap-2">
            <Input
              id="poolId"
              type="number"
              min="1"
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              placeholder="Enter pool ID"
              className="flex-1"
              disabled={isLoading}
            />
            <Button size="sm" onClick={handleSearch} disabled={isLoading || !poolId}>
              {isLoading ? 'Loading...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Results */}
        {poolInfo && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm">
              <div className="font-medium text-blue-900">Pool Information</div>
              <div className="flex justify-between">
                <span className="text-blue-700">Token</span>
                <span className="font-mono text-xs">{truncateAddress(poolInfo.token)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Matches Completed</span>
                <span className="font-mono">{poolInfo.matchesCompleted.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Finalized</span>
                <span className="font-mono">{poolInfo.finalized ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Prize Amount</span>
                <span className="font-mono">{formatEther(poolInfo.prizeAmount)} ETH</span>
              </div>
            </div>

            {poolWinners && poolWinners.winners.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-sm">
                <div className="font-medium text-amber-900">
                  Winners ({poolWinners.winners.length})
                </div>
                {poolWinners.winners.map((winner, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-amber-700 font-medium">#{idx + 1}</span>
                    <code className="text-xs font-mono flex-1">
                      {truncateAddress(winner)}
                    </code>
                    <span className="text-xs text-amber-700">
                      {poolWinners.winCounts[idx].toString()} wins
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        poolWinners.claimed[idx]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {poolWinners.claimed[idx] ? 'Claimed' : 'Unclaimed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>
    </Card>
  )
}
