'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOharaAi } from '@ohara-ai/sdk'
import { Info, Users, Coins } from 'lucide-react'
import { Address } from 'viem'

interface CycleDetailsProps {
  cycleId: bigint | undefined
}

export function CycleDetails({ cycleId }: CycleDetailsProps) {
  const { game } = useOharaAi()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueOps = (game as any)?.league?.operations

  const [oldestCycleId, setOldestCycleId] = useState<bigint | undefined>()
  const [cycleTokens, setCycleTokens] = useState<readonly Address[] | undefined>()
  const [cyclePlayers, setCyclePlayers] = useState<readonly Address[] | undefined>()

  useEffect(() => {
    const fetchData = async () => {
      if (!leagueOps) return

      try {
        const oldest = await leagueOps.getOldestCycleId()
        setOldestCycleId(oldest)

        if (cycleId !== undefined) {
          const [tokens, players] = await Promise.all([
            leagueOps.getCycleTokens(cycleId),
            leagueOps.getCyclePlayers(cycleId),
          ])
          setCycleTokens(tokens)
          setCyclePlayers(players)
        }
      } catch (error) {
        console.error('Error fetching cycle details:', error)
      }
    }

    fetchData()
  }, [leagueOps, cycleId])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Info className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-gray-900">Cycle Details</CardTitle>
            <CardDescription className="text-gray-600">
              Additional cycle information
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Oldest Cycle */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Oldest Cycle ID</div>
          <div className="text-lg font-semibold text-gray-900">
            {oldestCycleId !== undefined ? oldestCycleId.toString() : '—'}
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Cycle Tokens */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Coins className="w-4 h-4" />
            Tokens in Cycle {cycleId?.toString() || '—'}
          </div>
          {cycleTokens && cycleTokens.length > 0 ? (
            <div className="space-y-1">
              {cycleTokens.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <span className="font-mono text-gray-700">
                    {token === '0x0000000000000000000000000000000000000000'
                      ? 'Native Token (ETH)'
                      : formatAddress(token)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No tokens yet</div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        {/* Cycle Players */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users className="w-4 h-4" />
            Players in Cycle {cycleId?.toString() || '—'}
          </div>
          {cyclePlayers && cyclePlayers.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {cyclePlayers.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <span className="font-mono text-gray-700">{formatAddress(player)}</span>
                  <span className="text-gray-500">#{index + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No players yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
