'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, RefreshCw, Coins, Banknote } from 'lucide-react'
import { useAccount, useReadContract, useBlockNumber, useChainId } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { useOharaAi, GAME_MATCH_ABI, MatchStatus } from '@/sdk/src'

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
  const chainId = useChainId()
  const { game } = useOharaAi()
  const contractAddress = game.match?.address
  const [matches, setMatches] = useState<MatchData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Fetch active match IDs from the contract
  const { data: activeMatchIds, refetch: refetchMatchIds } = useReadContract({
    address: contractAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'getActiveMatchIds',
    args: [0n, 100n], // Fetch up to 100 active matches
    query: {
      enabled: !!contractAddress,
    },
  })

  // Fetch match details for all active match IDs
  useEffect(() => {
    if (!contractAddress || !activeMatchIds) {
      setMatches([])
      return
    }

    const fetchMatches = async () => {
      setIsLoading(true)
      const fetchedMatches: MatchData[] = []

      // Import viem's readContract for client-side reads
      const { readContract } = await import('wagmi/actions')
      const { config } = await import('@/lib/wagmi')

      console.log('[MatchList] Fetching matches for IDs:', activeMatchIds)

      for (const matchId of (activeMatchIds as readonly bigint[] | undefined) || []) {
        try {
          const result = await readContract(config, {
            address: contractAddress,
            abi: GAME_MATCH_ABI,
            functionName: 'getMatch',
            args: [matchId],
          })

          const [token, stakeAmount, maxPlayers, players, status, winner, createdAt] = result as readonly [
            `0x${string}`,
            bigint,
            bigint,
            readonly `0x${string}`[],
            number,
            `0x${string}`,
            bigint
          ]

          console.log(`[MatchList] Found match ${matchId.toString()} with ${players.length} players, status: ${status}`)
          const isNativeToken = token === zeroAddress
          fetchedMatches.push({
            id: Number(matchId),
            stakeAmount: formatEther(stakeAmount),
            maxPlayers: Number(maxPlayers),
            currentPlayers: players.length,
            status: ['Open', 'Active', 'Finalized'][status] || 'Unknown',
            token: isNativeToken ? 'ETH' : `${token.slice(0, 6)}...${token.slice(-4)}`,
            tokenAddress: token,
            isNativeToken,
            winner: winner !== zeroAddress ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : undefined,
          })
        } catch (err) {
          // Match read error, skip
          console.error(`[MatchList] Error reading match ${matchId.toString()}:`, err)
          continue
        }
      }
      
      console.log(`[MatchList] Total matches found: ${fetchedMatches.length}`)

      setMatches(fetchedMatches)
      setIsLoading(false)
    }

    fetchMatches()
  }, [contractAddress, activeMatchIds, blockNumber])

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
                refetchMatchIds()
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
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      <Banknote className="w-3 h-3 mr-1" />
                      ETH
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
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
                    <p className="font-semibold">{match.stakeAmount} {match.token}</p>
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
