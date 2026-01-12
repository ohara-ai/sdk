'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Users, ChevronRight } from 'lucide-react'
import { useOharaAi, TournamentStatus } from '@ohara-ai/sdk'
import type { TournamentView, BracketMatch } from '@ohara-ai/sdk'

interface TournamentBracketProps {
  tournamentId: bigint
}

/**
 * Tournament bracket display component
 */
export function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const [mounted, setMounted] = useState(false)
  const { game } = useOharaAi()

  const [tournament, setTournament] = useState<TournamentView | undefined>()
  const [roundMatches, setRoundMatches] = useState<BracketMatch[][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!game.tournament?.operations) {
      setLoading(false)
      return
    }

    const fetchTournamentData = async () => {
      try {
        setLoading(true)
        const tournamentData = await game.tournament.operations!.getTournament(
          tournamentId,
        )
        setTournament(tournamentData)

        // Fetch all round matches
        const allRoundMatches: BracketMatch[][] = []
        for (let i = 0; i <= Number(tournamentData.currentRound); i++) {
          const matches = await game.tournament.operations!.getRoundMatches(
            tournamentId,
            BigInt(i),
          )
          allRoundMatches.push(matches)
        }
        setRoundMatches(allRoundMatches)
      } catch (error) {
        console.error('[TournamentBracket] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTournamentData()
  }, [game.tournament?.operations, tournamentId])

  const getStatusBadge = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.Pending:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
            Pending
          </span>
        )
      case TournamentStatus.Active:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
            Active
          </span>
        )
      case TournamentStatus.Finalized:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            Finalized
          </span>
        )
      case TournamentStatus.Cancelled:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            Cancelled
          </span>
        )
      default:
        return null
    }
  }

  const shortenAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'TBD'
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!mounted) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Loading tournament data...</p>
        </CardContent>
      </Card>
    )
  }

  if (!tournament) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Tournament not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            Tournament #{tournamentId.toString()}
          </CardTitle>
          {getStatusBadge(tournament.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tournament Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{tournament.participantCount.toString()} participants</span>
            </div>
            <div>
              Round {tournament.currentRound.toString()} of{' '}
              {tournament.totalRounds.toString()}
            </div>
          </div>

          {/* Winner Display */}
          {tournament.status === TournamentStatus.Finalized &&
            tournament.winner !==
              '0x0000000000000000000000000000000000000000' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Winner:</span>
                  <span className="font-mono text-sm">
                    {shortenAddress(tournament.winner)}
                  </span>
                </div>
              </div>
            )}

          {/* Bracket Display */}
          <div className="overflow-x-auto">
            <div className="flex gap-8 min-w-max py-4">
              {roundMatches.map((matches, roundIndex) => (
                <div key={roundIndex} className="flex flex-col gap-4">
                  <div className="text-xs font-medium text-gray-500 text-center">
                    Round {roundIndex + 1}
                  </div>
                  {matches.map((match, matchIndex) => (
                    <div
                      key={matchIndex}
                      className={`border rounded-lg p-3 min-w-[200px] ${
                        match.resolved
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-purple-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div
                          className={`flex items-center justify-between p-2 rounded ${
                            match.resolved && match.winner === match.player1
                              ? 'bg-green-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <span className="text-xs font-mono">
                            {shortenAddress(match.player1)}
                          </span>
                          {match.resolved && match.winner === match.player1 && (
                            <ChevronRight className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div
                          className={`flex items-center justify-between p-2 rounded ${
                            match.resolved && match.winner === match.player2
                              ? 'bg-green-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          <span className="text-xs font-mono">
                            {shortenAddress(match.player2)}
                          </span>
                          {match.resolved && match.winner === match.player2 && (
                            <ChevronRight className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      {!match.resolved && (
                        <div className="mt-2 text-xs text-center text-purple-600">
                          In Progress
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
