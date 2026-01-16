'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOharaAi } from '@ohara-ai/sdk'
import { Search, Trophy } from 'lucide-react'
import { Address } from 'viem'

export function PlayerRankLookup() {
  const { game } = useOharaAi()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueOps = (game as any)?.league?.operations

  const [cycleId, setCycleId] = useState('')
  const [playerAddress, setPlayerAddress] = useState('')
  const [tokenAddress, setTokenAddress] = useState('0x0000000000000000000000000000000000000000')
  const [rank, setRank] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!cycleId || !playerAddress) {
      setError('Please enter cycle ID and player address')
      return
    }

    setLoading(true)
    setError(null)
    setRank(null)

    try {
      const playerRank = await leagueOps.getPlayerRank(
        BigInt(cycleId),
        playerAddress as Address,
        tokenAddress as Address
      )
      setRank(playerRank)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Trophy className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <CardTitle className="text-gray-900">Player Rank Lookup</CardTitle>
            <CardDescription className="text-gray-600">
              Find a player&apos;s rank in a specific cycle
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cycleId" className="text-sm text-gray-700">
            Cycle ID
          </Label>
          <Input
            id="cycleId"
            type="number"
            placeholder="0"
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="playerAddress" className="text-sm text-gray-700">
            Player Address
          </Label>
          <Input
            id="playerAddress"
            placeholder="0x..."
            value={playerAddress}
            onChange={(e) => setPlayerAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenAddress" className="text-sm text-gray-700">
            Token Address
          </Label>
          <Input
            id="tokenAddress"
            placeholder="0x0... (Native Token)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Default: 0x0000...0000 (Native Token)
          </p>
        </div>

        <Button
          onClick={handleLookup}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Search className="w-4 h-4 mr-2" />
          {loading ? 'Looking up...' : 'Lookup Rank'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {rank !== null && (
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Player Rank</div>
              <div className="text-4xl font-bold text-yellow-700">
                {rank === 0n ? 'Unranked' : `#${rank.toString()}`}
              </div>
              {rank === 0n && (
                <div className="text-xs text-gray-500 mt-2">
                  Player has no tokens won in this cycle
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
