'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCode, Percent, BarChart3, Trophy } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { useBlockNumber } from 'wagmi'

/**
 * Match contract information component that displays system addresses
 * and configuration for the GameMatch contract
 */
export function MatchContractInformation() {
  const [mounted, setMounted] = useState(false)
  const { game, app } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [feeConfig, setFeeConfig] = useState<{
    recipients: readonly `0x${string}`[]
    shares: readonly bigint[]
    totalShare: bigint
  } | null>(null)
  const [activeMatchCount, setActiveMatchCount] = useState<bigint | undefined>()
  const [maxActiveMatches, setMaxActiveMatches] = useState<bigint | undefined>()
  const [scoreboardAddress, setScoreboardAddress] = useState<
    `0x${string}` | undefined
  >()

  useEffect(() => {
    setMounted(true)
  }, [])

  const contractAddress = game.match?.address

  // Fetch GameMatch data
  useEffect(() => {
    if (!game.match?.operations) {
      return
    }

    const fetchMatchData = async () => {
      try {
        const [feeConfigData, activeCount, maxActive, scoreboardAddr] =
          await Promise.all([
            game.match.operations!.getFeeConfiguration(),
            game.match.operations!.getActiveMatchCount(),
            game.match.operations!.getMaxActiveMatches(),
            game.match.operations!.getScoreboardAddress(),
          ])

        setFeeConfig(feeConfigData)
        setActiveMatchCount(activeCount)
        setMaxActiveMatches(maxActive)
        setScoreboardAddress(scoreboardAddr)
      } catch (error) {
        console.error(
          '[MatchContractInformation] Error fetching match data:',
          error,
        )
      }
    }

    fetchMatchData()
    const interval = setInterval(fetchMatchData, 10000)
    return () => clearInterval(interval)
  }, [game.match?.operations, blockNumber])

  const feePercentage = feeConfig?.totalShare
    ? Number((feeConfig.totalShare * 100n) / 10000n)
    : 0

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          Contract Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Contract Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <FileCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">
                  Match Contract
                </p>
                <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                <Trophy className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">
                  Integrated Scores Contract
                </p>
                <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted || !scoreboardAddress
                    ? 'Loading...'
                    : scoreboardAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Configuration & Match Capacity */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fee Configuration */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Percent className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Fee Configuration
                  </h3>
                </div>
                {!mounted || !feeConfig ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Total Fee
                      </span>
                      <span className="text-sm font-semibold text-purple-600">
                        {feePercentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Recipients
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {feeConfig.recipients.length}
                      </span>
                    </div>
                    {feeConfig.recipients.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {feeConfig.recipients.map((recipient, idx) => {
                          const share = feeConfig.shares[idx]
                          const sharePercentage = share
                            ? Number((share * 100n) / feeConfig.totalShare)
                            : 0
                          return (
                            <div
                              key={recipient}
                              className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="font-mono text-gray-600 truncate flex-1 mr-2">
                                {recipient.slice(0, 10)}...{recipient.slice(-8)}
                              </span>
                              <span className="font-medium text-purple-600">
                                {sharePercentage.toFixed(1)}%
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Match Capacity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Match Capacity
                  </h3>
                </div>
                {!mounted ||
                activeMatchCount === undefined ||
                maxActiveMatches === undefined ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Active Matches
                      </span>
                      <span className="text-sm font-semibold text-cyan-600">
                        {activeMatchCount.toString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Max Concurrent
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {maxActiveMatches === 0n
                          ? '∞'
                          : maxActiveMatches.toString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
