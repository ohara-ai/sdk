'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, XCircle, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useOharaAi, TournamentStatus } from '@ohara-ai/sdk'
import type { TournamentView, BracketMatch } from '@ohara-ai/sdk'
import { isAddress } from 'viem'

interface TournamentActionsProps {
  tournamentId: bigint
  tournament: TournamentView
  onActionComplete?: () => void
}

/**
 * Component for tournament controller actions (activate, cancel, resolve match)
 */
export function TournamentActions({
  tournamentId,
  tournament,
  onActionComplete,
}: TournamentActionsProps) {
  const { game } = useOharaAi()
  const [isActivating, setIsActivating] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [resolveRound, setResolveRound] = useState('')
  const [resolveMatchIndex, setResolveMatchIndex] = useState('')
  const [resolveWinner, setResolveWinner] = useState('')
  const [currentRoundMatches, setCurrentRoundMatches] = useState<BracketMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  const handleActivate = async () => {
    setError(null)
    setSuccess(null)

    try {
      setIsActivating(true)

      const response = await fetch('/api/sdk/game/tournament/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournamentId.toString() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate tournament')
      }

      setSuccess(`Tournament activated! TX: ${data.txHash.slice(0, 10)}...`)
      if (onActionComplete) onActionComplete()
    } catch (err: any) {
      console.error('Error activating tournament:', err)
      setError(err.message || 'Failed to activate tournament')
    } finally {
      setIsActivating(false)
    }
  }

  const handleCancel = async () => {
    setError(null)
    setSuccess(null)

    if (!confirm('Are you sure you want to cancel this tournament?')) {
      return
    }

    try {
      setIsCanceling(true)

      const response = await fetch('/api/sdk/game/tournament/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournamentId.toString() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel tournament')
      }

      setSuccess(`Tournament cancelled! TX: ${data.txHash.slice(0, 10)}...`)
      if (onActionComplete) onActionComplete()
    } catch (err: any) {
      console.error('Error canceling tournament:', err)
      setError(err.message || 'Failed to cancel tournament')
    } finally {
      setIsCanceling(false)
    }
  }

  const loadCurrentRoundMatches = async () => {
    if (!game.tournament?.operations) return

    try {
      setLoadingMatches(true)
      const matches = await game.tournament.operations.getRoundMatches(
        tournamentId,
        tournament.currentRound,
      )
      setCurrentRoundMatches(matches)
      setResolveRound(tournament.currentRound.toString())
    } catch (err) {
      console.error('Error loading matches:', err)
    } finally {
      setLoadingMatches(false)
    }
  }

  const handleResolveMatch = async () => {
    setError(null)
    setSuccess(null)

    if (!resolveRound || !resolveMatchIndex || !resolveWinner) {
      setError('All fields are required')
      return
    }

    if (!isAddress(resolveWinner)) {
      setError('Invalid winner address')
      return
    }

    try {
      setIsResolving(true)

      const response = await fetch('/api/sdk/game/tournament/resolve-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournamentId.toString(),
          round: resolveRound,
          matchIndex: resolveMatchIndex,
          winner: resolveWinner,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve match')
      }

      setSuccess(`Match resolved! TX: ${data.txHash.slice(0, 10)}...`)
      setResolveRound('')
      setResolveMatchIndex('')
      setResolveWinner('')
      if (onActionComplete) onActionComplete()
    } catch (err: any) {
      console.error('Error resolving match:', err)
      setError(err.message || 'Failed to resolve match')
    } finally {
      setIsResolving(false)
    }
  }

  const shortenAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'TBD'
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          Tournament Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium">
              Status: {TournamentStatus[tournament.status]}
            </p>
            <p className="mt-1">
              Round: {tournament.currentRound.toString()} of{' '}
              {tournament.totalRounds.toString()}
            </p>
          </div>

          {/* Activate Button */}
          {tournament.status === TournamentStatus.Pending && (
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              variant="controller"
              className="w-full"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activate Tournament
                </>
              )}
            </Button>
          )}

          {/* Cancel Button */}
          {(tournament.status === TournamentStatus.Pending ||
            tournament.status === TournamentStatus.Active) && (
            <Button
              onClick={handleCancel}
              disabled={isCanceling}
              variant="admin"
              className="w-full"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Tournament
                </>
              )}
            </Button>
          )}

          {/* Manual Match Resolution */}
          {tournament.status === TournamentStatus.Active && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-900">
                  Manual Match Resolution
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadCurrentRoundMatches}
                  disabled={loadingMatches}
                  className="h-7 text-xs"
                >
                  {loadingMatches ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Load Current Round'
                  )}
                </Button>
              </div>

              {currentRoundMatches.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">
                    Current Round Matches:
                  </p>
                  {currentRoundMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded ${
                        match.resolved ? 'bg-gray-200' : 'bg-white border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Match #{idx}</span>
                        {match.resolved && (
                          <span className="text-green-600 font-medium">
                            Resolved
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {shortenAddress(match.player1)}
                          </span>
                          {match.resolved && match.winner === match.player1 && (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {shortenAddress(match.player2)}
                          </span>
                          {match.resolved && match.winner === match.player2 && (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                      </div>
                      {!match.resolved && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResolveRound(tournament.currentRound.toString())
                              setResolveMatchIndex(idx.toString())
                              setResolveWinner(match.player1)
                            }}
                            className="flex-1 h-6 text-xs"
                          >
                            P1 Wins
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResolveRound(tournament.currentRound.toString())
                              setResolveMatchIndex(idx.toString())
                              setResolveWinner(match.player2)
                            }}
                            className="flex-1 h-6 text-xs"
                          >
                            P2 Wins
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-gray-700">
                    Round
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={resolveRound}
                    onChange={(e) => setResolveRound(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">
                    Match Index
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={resolveMatchIndex}
                    onChange={(e) => setResolveMatchIndex(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700">
                    Winner Address
                  </Label>
                  <Input
                    placeholder="0x..."
                    value={resolveWinner}
                    onChange={(e) => setResolveWinner(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <Button
                  onClick={handleResolveMatch}
                  disabled={isResolving}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve Match
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
