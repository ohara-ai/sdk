'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { History, Search } from 'lucide-react'
import { useOharaAi, SCORE_ABI } from '@ohara-ai/sdk'
import { usePublicClient } from 'wagmi'
import { formatEther } from 'viem'

interface MatchHistoryProps {
  contractAddress?: `0x${string}`
}

interface MatchRecord {
  matchId: string
  winner: string
  losers: string[]
  prizeAmount: bigint
  timestamp: bigint
}

export function MatchHistory({ contractAddress }: MatchHistoryProps) {
  const publicClient = usePublicClient()
  
  const [matchId, setMatchId] = useState('')
  const [matchRecord, setMatchRecord] = useState<MatchRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetMatchRecord = async () => {
    if (!publicClient || !contractAddress) {
      setError('Missing required configuration')
      return
    }

    const id = parseInt(matchId)
    if (isNaN(id) || id < 1) {
      setError('Invalid match ID')
      return
    }

    setLoading(true)
    setError(null)
    setMatchRecord(null)

    try {
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: SCORE_ABI,
        functionName: 'getMatchRecord',
        args: [BigInt(id)],
      })

      const [winner, losers, prizeAmount, timestamp] = result as [
        string,
        string[],
        bigint,
        bigint,
      ]

      if (winner === '0x0000000000000000000000000000000000000000') {
        setError('Match not found')
        return
      }

      setMatchRecord({
        matchId,
        winner,
        losers,
        prizeAmount,
        timestamp,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch match record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          Match History
        </CardTitle>
        <CardDescription className="text-gray-600">
          Look up individual match records by ID
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="match-id" className="text-xs text-gray-700">
              Match ID
            </Label>
            <Input
              id="match-id"
              type="number"
              min="1"
              placeholder="Enter match ID"
              value={matchId}
              onChange={(e) => {
                setMatchId(e.target.value)
                setMatchRecord(null)
                setError(null)
              }}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleGetMatchRecord}
            disabled={!matchId || loading}
            size="sm"
            className="w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Searching...' : 'Get Match Record'}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {matchRecord && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Match ID</div>
              <div className="text-sm text-gray-900">{matchRecord.matchId}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Winner</div>
              <code className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                {matchRecord.winner}
              </code>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Losers ({matchRecord.losers.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {matchRecord.losers.length > 0 ? (
                  matchRecord.losers.map((loser, idx) => (
                    <code
                      key={idx}
                      className="block text-xs text-red-700 bg-red-50 px-2 py-1 rounded"
                    >
                      {loser}
                    </code>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 italic">No losers recorded</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Prize Amount</div>
              <div className="text-sm font-bold text-gray-900">
                {parseFloat(formatEther(matchRecord.prizeAmount)).toFixed(4)} ETH
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Timestamp</div>
              <div className="text-sm text-gray-900">
                {new Date(Number(matchRecord.timestamp) * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
