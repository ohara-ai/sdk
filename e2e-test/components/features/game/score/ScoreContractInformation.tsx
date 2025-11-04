'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCode, Users, BarChart3, Target } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { useBlockNumber } from 'wagmi'

/**
 * Score contract information component that displays system addresses
 * and configuration for the GameScore contract
 */
export function ScoreContractInformation() {
  const [mounted, setMounted] = useState(false)
  const { game, app } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [maxLosersPerMatch, setMaxLosersPerMatch] = useState<bigint | undefined>()
  const [maxTotalPlayers, setMaxTotalPlayers] = useState<bigint | undefined>()
  const [maxTotalMatches, setMaxTotalMatches] = useState<bigint | undefined>()
  const [totalPlayers, setTotalPlayers] = useState<bigint | undefined>()
  const [totalMatches, setTotalMatches] = useState<bigint | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  const contractAddress = game.scores?.address

  // Fetch GameScore data
  useEffect(() => {
    if (!game.scores?.operations) {
      return
    }

    const fetchScoreData = async () => {
      try {
        const [maxLosers, maxPlayers, maxMatches, players, matches] = await Promise.all([
          game.scores.operations!.getMaxLosersPerMatch(),
          game.scores.operations!.getMaxTotalPlayers(),
          game.scores.operations!.getMaxTotalMatches(),
          game.scores.operations!.getTotalPlayers(),
          game.scores.operations!.getTotalMatches(),
        ])
        
        setMaxLosersPerMatch(maxLosers)
        setMaxTotalPlayers(maxPlayers)
        setMaxTotalMatches(maxMatches)
        setTotalPlayers(players)
        setTotalMatches(matches)
      } catch (error) {
        console.error('[ScoreContractInformation] Error fetching score data:', error)
      }
    }

    fetchScoreData()
    const interval = setInterval(fetchScoreData, 10000)
    return () => clearInterval(interval)
  }, [game.scores?.operations, blockNumber])

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">Contract Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Contract Address & Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <FileCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">Score Contract</p>
                <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">Match Configuration</p>
                <div className="bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted || maxLosersPerMatch === undefined ? (
                    <p className="text-xs text-gray-500">Loading...</p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">Max Losers Per Match</span>
                      <span className="text-sm font-semibold text-orange-600">{maxLosersPerMatch.toString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player & Match Statistics */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Player Stats */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Player Statistics</h3>
                </div>
                {!mounted || totalPlayers === undefined || maxTotalPlayers === undefined ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Current</span>
                      <span className="font-semibold text-indigo-600">{totalPlayers.toString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Maximum</span>
                      <span className="font-semibold text-gray-900">{maxTotalPlayers.toString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Match Stats */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-cyan-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Match Statistics</h3>
                </div>
                {!mounted || totalMatches === undefined || maxTotalMatches === undefined ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Current</span>
                      <span className="font-semibold text-cyan-600">{totalMatches.toString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Maximum</span>
                      <span className="font-semibold text-gray-900">{maxTotalMatches.toString()}</span>
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
