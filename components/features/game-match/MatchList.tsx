'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, RefreshCw } from 'lucide-react'
import { useAccount, useReadContract, useBlockNumber } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { GAME_MATCH_ABI, getGameMatchAddress, MatchStatus } from '@/lib/contracts/gameMatch'

interface MatchListProps {
  onSelectMatch: (matchId: number) => void
  selectedMatchId: number | null
}

interface MatchData {
  id: number
  stakeAmount: string
  maxPlayers: number
  currentPlayers: number
  status: string
  token: string
  winner?: string
}

export function MatchList({ onSelectMatch, selectedMatchId }: MatchListProps) {
  const contractAddress = getGameMatchAddress()
  const [matches, setMatches] = useState<MatchData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [matchCount, setMatchCount] = useState(10) // Fetch first 10 matches by default
  
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // For now, we'll use a simple approach: try to read matches 0-9
  // In production, you'd want to use event logs or a subgraph to get match IDs
  useEffect(() => {
    if (!contractAddress) {
      setMatches([])
      return
    }

    const fetchMatches = async () => {
      setIsLoading(true)
      const fetchedMatches: MatchData[] = []

      // Import viem's readContract for client-side reads
      const { readContract } = await import('wagmi/actions')
      const { config } = await import('@/lib/wagmi')

      for (let i = 0; i < matchCount; i++) {
        try {
          const result = await readContract(config, {
            address: contractAddress,
            abi: GAME_MATCH_ABI,
            functionName: 'getMatch',
            args: [BigInt(i)],
          })

          const [token, stakeAmount, maxPlayers, players, status, winner] = result as [
            string,
            bigint,
            bigint,
            string[],
            number,
            string
          ]

          // Only add if match exists (has players)
          if (players && players.length > 0) {
            fetchedMatches.push({
              id: i,
              stakeAmount: formatEther(stakeAmount),
              maxPlayers: Number(maxPlayers),
              currentPlayers: players.length,
              status: ['Open', 'Active', 'Finalized'][status] || 'Unknown',
              token: token === zeroAddress ? 'ETH' : `${token.slice(0, 6)}...${token.slice(-4)}`,
              winner: winner !== zeroAddress ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : undefined,
            })
          }
        } catch (err) {
          // Match doesn't exist or error, skip
          continue
        }
      }

      setMatches(fetchedMatches)
      setIsLoading(false)
    }

    fetchMatches()
  }, [contractAddress, blockNumber, matchCount])

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Matches</CardTitle>
          <CardDescription>
            Contract not deployed on this network
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please switch to a supported network
        </CardContent>
      </Card>
    )
  }
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-500/10 text-green-500'
      case 'Active':
        return 'bg-blue-500/10 text-blue-500'
      case 'Finalized':
        return 'bg-gray-500/10 text-gray-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Matches</CardTitle>
              <CardDescription>
                Select a match to view details and interact
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const fetchMatches = async () => {
                  if (!contractAddress) return
                  setIsLoading(true)
                  const fetchedMatches: MatchData[] = []
                  const { readContract } = await import('wagmi/actions')
                  const { config } = await import('@/lib/wagmi')

                  for (let i = 0; i < matchCount; i++) {
                    try {
                      const result = await readContract(config, {
                        address: contractAddress,
                        abi: GAME_MATCH_ABI,
                        functionName: 'getMatch',
                        args: [BigInt(i)],
                      })
                      const [token, stakeAmount, maxPlayers, players, status, winner] = result as [
                        string,
                        bigint,
                        bigint,
                        string[],
                        number,
                        string
                      ]
                      if (players && players.length > 0) {
                        fetchedMatches.push({
                          id: i,
                          stakeAmount: formatEther(stakeAmount),
                          maxPlayers: Number(maxPlayers),
                          currentPlayers: players.length,
                          status: ['Open', 'Active', 'Finalized'][status] || 'Unknown',
                          token: token === zeroAddress ? 'ETH' : `${token.slice(0, 6)}...${token.slice(-4)}`,
                          winner: winner !== zeroAddress ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : undefined,
                        })
                      }
                    } catch (err) {
                      continue
                    }
                  }
                  setMatches(fetchedMatches)
                  setIsLoading(false)
                }
                fetchMatches()
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading && matches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading matches...
          </CardContent>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No matches available. Create one to get started!
          </CardContent>
        </Card>
      ) : (
        matches.map((match: MatchData) => (
          <Card
            key={match.id}
            className={`cursor-pointer transition-colors ${
              selectedMatchId === match.id ? 'border-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => onSelectMatch(match.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Match #{match.id}</CardTitle>
                <Badge className={getStatusColor(match.status)}>
                  {match.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Stake Amount</p>
                  <p className="font-semibold">{match.stakeAmount} {match.token}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Players</p>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <p className="font-semibold">
                      {match.currentPlayers}/{match.maxPlayers}
                    </p>
                  </div>
                </div>
                {match.winner && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Winner</p>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <p className="font-semibold">{match.winner}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
