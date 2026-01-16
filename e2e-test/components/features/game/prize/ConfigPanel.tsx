'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, ExternalLink } from 'lucide-react'

interface ConfigPanelProps {
  winnersCount: bigint | undefined
  distributionStrategy: number | undefined
  matchesPerPool: bigint | undefined
  onSetWinnersCount: (count: bigint) => Promise<`0x${string}`>
  onSetDistributionStrategy: (strategy: number) => Promise<`0x${string}`>
  onSetMatchesPerPool: (matches: bigint) => Promise<`0x${string}`>
}

const DISTRIBUTION_STRATEGIES = [
  { value: 0, label: 'Equal', description: 'Equal split among all winners' },
  { value: 1, label: 'Linear', description: '1st: N shares, 2nd: N-1, etc.' },
  { value: 2, label: 'Exponential', description: '50%, 25%, 12.5%, etc.' },
  { value: 3, label: 'Winner Take All', description: '100% to first place' },
  { value: 4, label: 'Proportional To Wins', description: 'Based on win count' },
]

export function ConfigPanel({
  winnersCount,
  distributionStrategy,
  matchesPerPool,
  onSetWinnersCount,
  onSetDistributionStrategy,
  onSetMatchesPerPool,
}: ConfigPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const [newWinnersCount, setNewWinnersCount] = useState('')
  const [newStrategy, setNewStrategy] = useState<string>('')
  const [newMatchesPerPool, setNewMatchesPerPool] = useState('')

  const handleSetWinnersCount = async () => {
    if (!newWinnersCount) return
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onSetWinnersCount(BigInt(newWinnersCount))
      setTxHash(tx)
      setNewWinnersCount('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set winners count')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSetStrategy = async () => {
    if (newStrategy === '') return
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onSetDistributionStrategy(parseInt(newStrategy))
      setTxHash(tx)
      setNewStrategy('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set distribution strategy')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSetMatchesPerPool = async () => {
    if (!newMatchesPerPool) return
    setIsUpdating(true)
    setError(null)
    setTxHash(null)
    try {
      const tx = await onSetMatchesPerPool(BigInt(newMatchesPerPool))
      setTxHash(tx)
      setNewMatchesPerPool('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set matches per pool')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStrategy = DISTRIBUTION_STRATEGIES.find(s => s.value === distributionStrategy)

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-gray-900">Owner Configuration</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Update prize pool settings (owner only, affects new pools)
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-4">
        {/* Current Configuration */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Winners Count</span>
            <span className="font-mono font-semibold">{winnersCount?.toString() ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distribution Strategy</span>
            <span className="font-mono font-semibold text-xs">
              {currentStrategy?.label ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Matches Per Pool</span>
            <span className="font-mono font-semibold">{matchesPerPool?.toString() ?? '—'}</span>
          </div>
        </div>

        {/* Set Winners Count */}
        <div className="space-y-2">
          <Label htmlFor="winnersCount" className="text-xs text-gray-700">
            Set Winners Count (1-100)
          </Label>
          <div className="flex gap-2">
            <Input
              id="winnersCount"
              type="number"
              min="1"
              max="100"
              value={newWinnersCount}
              onChange={(e) => setNewWinnersCount(e.target.value)}
              placeholder="e.g., 10"
              className="flex-1"
              disabled={isUpdating}
            />
            <Button
              size="sm"
              onClick={handleSetWinnersCount}
              disabled={isUpdating || !newWinnersCount}
            >
              Set
            </Button>
          </div>
        </div>

        {/* Set Distribution Strategy */}
        <div className="space-y-2">
          <Label htmlFor="strategy" className="text-xs text-gray-700">
            Set Distribution Strategy
          </Label>
          <div className="flex gap-2">
            <select
              id="strategy"
              value={newStrategy}
              onChange={(e) => setNewStrategy(e.target.value)}
              disabled={isUpdating}
              className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select strategy</option>
              {DISTRIBUTION_STRATEGIES.map((strategy) => (
                <option key={strategy.value} value={strategy.value.toString()}>
                  {strategy.label} - {strategy.description}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleSetStrategy}
              disabled={isUpdating || newStrategy === ''}
            >
              Set
            </Button>
          </div>
        </div>

        {/* Set Matches Per Pool */}
        <div className="space-y-2">
          <Label htmlFor="matchesPerPool" className="text-xs text-gray-700">
            Set Matches Per Pool
          </Label>
          <div className="flex gap-2">
            <Input
              id="matchesPerPool"
              type="number"
              min="1"
              value={newMatchesPerPool}
              onChange={(e) => setNewMatchesPerPool(e.target.value)}
              placeholder="e.g., 10"
              className="flex-1"
              disabled={isUpdating}
            />
            <Button
              size="sm"
              onClick={handleSetMatchesPerPool}
              disabled={isUpdating || !newMatchesPerPool}
            >
              Set
            </Button>
          </div>
        </div>

        {/* Transaction Result */}
        {txHash && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Transaction submitted</span>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-700"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-xs mt-1 break-all opacity-75">{txHash}</p>
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
