'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, RefreshCw, Coins, Banknote } from 'lucide-react'
import { useBlockNumber, useChainId } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { useOharaAi } from '@ohara-ai/sdk'

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
  tokenAddress: string // Raw token address
  isNativeToken: boolean
  winner?: string
}

export function MatchList({ onSelectMatch, selectedMatchId }: MatchListProps) {
  const { game } = useOharaAi()
  const [matches, setMatches] = useState<MatchData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Fetch match details using SDK
  useEffect(() => {
    if (!game.match.operations) {
      setMatches([])
      return
    }

    const fetchMatches = async () => {
      setIsLoading(true)
      const fetchedMatches: MatchData[] = []

      try {
        if (!game.match.operations) {
          throw new Error('Match operations not available')
        }

        console.log('[MatchList] Fetching active match IDs from SDK')

        // Get all active match IDs from SDK (no pagination)
        const activeMatchIds = await game.match.operations.getActiveMatches()

        console.log('[MatchList] Fetching matches for IDs:', activeMatchIds)

        // Fetch details for each match
        for (const matchId of activeMatchIds) {
          try {
            const match = await game.match.operations.get(matchId)

            console.log(
              `[MatchList] Found match ${matchId.toString()} with ${match.players.length} players, status: ${match.status}`,
            )
            const isNativeToken = match.token === zeroAddress
            fetchedMatches.push({
              id: Number(matchId),
              stakeAmount: formatEther(match.stakeAmount),
              maxPlayers: match.maxPlayers,
              currentPlayers: match.players.length,
              status:
                ['Open', 'Active', 'Finalized'][match.status] || 'Unknown',
              token: isNativeToken
                ? 'ETH'
                : `${match.token.slice(0, 6)}...${match.token.slice(-4)}`,
              tokenAddress: match.token,
              isNativeToken,
              winner:
                match.winner !== zeroAddress
                  ? `${match.winner.slice(0, 6)}...${match.winner.slice(-4)}`
                  : undefined,
            })
          } catch (err) {
            // Match read error, skip
            console.error(
              `[MatchList] Error reading match ${matchId.toString()}:`,
              err,
            )
            continue
          }
        }

        console.log(`[MatchList] Total matches found: ${fetchedMatches.length}`)

        setMatches(fetchedMatches)
      } catch (error) {
        console.error('[MatchList] Error fetching matches:', error)
        setMatches([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [game.match.operations, blockNumber, refreshTrigger])

  if (!game.match?.address) {
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
                setRefreshTrigger((prev) => prev + 1)
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
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
              selectedMatchId === match.id
                ? 'border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => {
              console.log(`[MatchList] Selected match: ${match.id}`)
              onSelectMatch(match.id)
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Match #{match.id}</CardTitle>
                  {match.isNativeToken ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                    >
                      <Banknote className="w-3 h-3 mr-1" />
                      ETH
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-500 border-purple-500/20"
                    >
                      <Coins className="w-3 h-3 mr-1" />
                      ERC20
                    </Badge>
                  )}
                </div>
                <Badge className={getStatusColor(match.status)}>
                  {match.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Stake Amount</p>
                  <div className="flex items-center gap-1">
                    {match.isNativeToken ? (
                      <Banknote className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Coins className="w-4 h-4 text-purple-500" />
                    )}
                    <p className="font-semibold">
                      {match.stakeAmount} {match.token}
                    </p>
                  </div>
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
