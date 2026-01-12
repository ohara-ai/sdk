'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCode, Users, Trophy, Target } from 'lucide-react'
import { useOharaAi } from '@ohara-ai/sdk'
import { useBlockNumber } from 'wagmi'

/**
 * Tournament contract information component that displays system addresses
 * and configuration for the Tournament contract
 */
export function TournamentContractInformation() {
  const [mounted, setMounted] = useState(false)
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [maxActiveTournaments, setMaxActiveTournaments] = useState<
    bigint | undefined
  >()
  const [maxParticipants, setMaxParticipants] = useState<bigint | undefined>()
  const [activeTournamentCount, setActiveTournamentCount] = useState<
    bigint | undefined
  >()
  const [scoreContract, setScoreContract] = useState<string | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  const contractAddress = game.tournament?.address

  useEffect(() => {
    if (!game.tournament?.operations) {
      return
    }

    const fetchTournamentData = async () => {
      try {
        const [maxActive, maxPart, activeCount, score] = await Promise.all([
          game.tournament.operations!.getMaxActiveTournaments(),
          game.tournament.operations!.getMaxParticipants(),
          game.tournament.operations!.getActiveTournamentCount(),
          game.tournament.operations!.getScoreContract(),
        ])

        setMaxActiveTournaments(maxActive)
        setMaxParticipants(maxPart)
        setActiveTournamentCount(activeCount)
        setScoreContract(score)
      } catch (error) {
        console.error(
          '[TournamentContractInformation] Error fetching tournament data:',
          error,
        )
      }
    }

    fetchTournamentData()
    const interval = setInterval(fetchTournamentData, 10000)
    return () => clearInterval(interval)
  }, [game.tournament?.operations, blockNumber])

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          Tournament Contract Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Contract Address & Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                <Trophy className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">
                  Tournament Contract
                </p>
                <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <FileCode className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1.5">
                  Score Contract
                </p>
                <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  {!mounted
                    ? 'Loading...'
                    : scoreContract || 'Not configured'}
                </p>
              </div>
            </div>
          </div>

          {/* Tournament Statistics */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Tournaments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Target className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Active Tournaments
                  </h3>
                </div>
                {!mounted ||
                activeTournamentCount === undefined ||
                maxActiveTournaments === undefined ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Current</span>
                      <span className="font-semibold text-green-600">
                        {activeTournamentCount.toString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Maximum</span>
                      <span className="font-semibold text-gray-900">
                        {maxActiveTournaments.toString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Participant Limits */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Users className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Participant Configuration
                  </h3>
                </div>
                {!mounted || maxParticipants === undefined ? (
                  <p className="text-xs text-gray-500 ml-10">Loading...</p>
                ) : (
                  <div className="ml-10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">
                        Max Per Tournament
                      </span>
                      <span className="font-semibold text-orange-600">
                        {maxParticipants.toString()}
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
