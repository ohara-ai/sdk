'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, Clock, CheckCircle2, AlertCircle, Play, Flag } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber, useChainId } from 'wagmi'
import { formatEther, zeroAddress, parseEther } from 'viem'
import { GAME_MATCH_ABI, MatchStatus } from '@/lib/contracts/gameMatch'
import { useTokenApproval } from '@/lib/hooks/useTokenApproval'
import { useOharaAi } from '@/sdk/src/context/OharaAiProvider'
import { ContractType } from '@/sdk/src/types/contracts'

interface MatchDetailsProps {
  matchId: number | null
  onMatchDeleted?: () => void
}

interface MatchData {
  token: string
  stakeAmount: bigint
  maxPlayers: bigint
  players: string[]
  status: number
  winner: string
}

export function MatchDetails({ matchId, onMatchDeleted }: MatchDetailsProps) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { getContractAddress } = useOharaAi()
  const contractAddress = getContractAddress(ContractType.GAME_MATCH)
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [isLoadingMatch, setIsLoadingMatch] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [activateSuccess, setActivateSuccess] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizeSuccess, setFinalizeSuccess] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [showWinnerPicker, setShowWinnerPicker] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState<{
    winner: string
    totalPrize: string
    winnerAmount: string
  } | null>(null)

  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Write hooks for actions
  const { data: joinHash, writeContract: joinMatch, isPending: isJoining, error: joinError, reset: resetJoin } = useWriteContract()
  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess } = useWaitForTransactionReceipt({ hash: joinHash })

  const { data: withdrawHash, writeContract: withdrawStake, isPending: isWithdrawing, error: withdrawError, reset: resetWithdraw } = useWriteContract()
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash })

  // Reset transaction states when matchId changes to clear success/error messages
  useEffect(() => {
    resetJoin()
    resetWithdraw()
    setActivateSuccess(false)
    setActivateError(null)
    setFinalizeSuccess(false)
    setFinalizeError(null)
    setShowWinnerPicker(false)
    setSelectedWinner(null)
    setFinalizeResult(null)
  }, [matchId, resetJoin, resetWithdraw])

  // Fetch match data
  useEffect(() => {
    if (matchId === null || !contractAddress) {
      setMatchData(null)
      return
    }

    const fetchMatchData = async () => {
      setIsLoadingMatch(true)
      setFetchError(null)
      try {
        const { readContract } = await import('wagmi/actions')
        const { config } = await import('@/lib/wagmi')

        console.log(`[MatchDetails] Fetching match ${matchId} from ${contractAddress}`)

        const result = await readContract(config, {
          address: contractAddress,
          abi: GAME_MATCH_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)],
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

        console.log(`[MatchDetails] Fetched match ${matchId}:`, {
          token,
          stakeAmount: stakeAmount.toString(),
          maxPlayers: maxPlayers.toString(),
          playersCount: players.length,
          status,
        })

        // Check if match actually exists (has players)
        if (!players || players.length === 0) {
          console.warn(`[MatchDetails] Match ${matchId} has no players`)
          setFetchError('This match does not exist or has been deleted')
          setMatchData(null)
          // If this happened after a successful withdrawal, clear the selection
          if (isWithdrawSuccess && onMatchDeleted) {
            console.log('[MatchDetails] Match deleted after withdrawal, clearing selection')
            onMatchDeleted()
          }
          return
        }

        setMatchData({
          token: token as string,
          stakeAmount,
          maxPlayers,
          players: Array.from(players) as string[],
          status,
          winner: winner as string,
        })
        setFetchError(null)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[MatchDetails] Error fetching match ${matchId}:`, error)
        setFetchError(errorMessage)
        setMatchData(null)
      } finally {
        setIsLoadingMatch(false)
      }
    }

    fetchMatchData()
  }, [matchId, contractAddress, blockNumber, isJoinSuccess, isWithdrawSuccess, activateSuccess, finalizeSuccess])

  // Token approval for joining matches with custom tokens
  const {
    needsApproval,
    isNativeToken,
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
  } = useTokenApproval({
    tokenAddress: matchData?.token || zeroAddress,
    spenderAddress: contractAddress || zeroAddress,
    amount: matchData?.stakeAmount || 0n,
    enabled: !!matchData && !!contractAddress && matchData.status === MatchStatus.Open,
  })

  const handleJoinMatch = () => {
    if (!contractAddress || matchId === null || !matchData) return

    joinMatch({
      address: contractAddress,
      abi: GAME_MATCH_ABI,
      functionName: 'joinMatch',
      args: [BigInt(matchId)],
      value: matchData.token === zeroAddress ? matchData.stakeAmount : 0n,
    })
  }

  const handleWithdrawStake = () => {
    if (!contractAddress || matchId === null) return

    withdrawStake({
      address: contractAddress,
      abi: GAME_MATCH_ABI,
      functionName: 'withdrawStake',
      args: [BigInt(matchId)],
    })
  }

  const handleActivateMatch = async () => {
    if (!contractAddress || matchId === null) return

    setIsActivating(true)
    setActivateError(null)
    setActivateSuccess(false)

    try {
      const response = await fetch('/api/activate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          contractAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate match')
      }

      setActivateSuccess(true)
      console.log('[MatchDetails] Match activated:', data.transactionHash)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[MatchDetails] Activation error:', error)
      setActivateError(errorMessage)
    } finally {
      setIsActivating(false)
    }
  }

  const handleFinalizeMatch = async () => {
    if (!contractAddress || matchId === null || !selectedWinner) return

    setIsFinalizing(true)
    setFinalizeError(null)
    setFinalizeSuccess(false)

    try {
      const response = await fetch('/api/finalize-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          winner: selectedWinner,
          contractAddress,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to finalize match')
      }

      setFinalizeSuccess(true)
      setShowWinnerPicker(false)
      
      // Store finalization result if available
      if (data.totalPrize && data.winnerAmount) {
        setFinalizeResult({
          winner: data.winner,
          totalPrize: data.totalPrize,
          winnerAmount: data.winnerAmount,
        })
      }
      
      console.log('[MatchDetails] Match finalized:', data.transactionHash)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[MatchDetails] Finalization error:', error)
      setFinalizeError(errorMessage)
    } finally {
      setIsFinalizing(false)
    }
  }

  if (matchId === null) {
    return (
      <Card className="h-fit sticky top-8">
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>
            Select a match to view details
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No match selected
        </CardContent>
      </Card>
    )
  }

  if (isLoadingMatch) {
    return (
      <Card className="h-fit sticky top-8">
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading match data...
        </CardContent>
      </Card>
    )
  }

  if (!matchData) {
    // If we have finalization result, show that even if match data is cleaned up
    if (finalizeSuccess && finalizeResult) {
      return (
        <Card className="h-fit sticky top-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Match #{matchId}</CardTitle>
              <Badge className="bg-gray-500/10 text-gray-500">
                Finalized
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm font-semibold text-green-500">
                  Match Finalized Successfully!
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Winner</p>
                    <p className="font-mono font-medium">
                      {finalizeResult.winner.slice(0, 6)}...{finalizeResult.winner.slice(-4)}
                      {finalizeResult.winner.toLowerCase() === address?.toLowerCase() && ' (You)'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Total Prize Pool:</span>
                    <span className="font-medium">
                      {formatEther(BigInt(finalizeResult.totalPrize))} ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Winner Received:</span>
                    <span className="font-semibold text-green-600">
                      {formatEther(BigInt(finalizeResult.winnerAmount))} ETH
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fees Deducted:</span>
                    <span className="text-muted-foreground">
                      {formatEther(BigInt(finalizeResult.totalPrize) - BigInt(finalizeResult.winnerAmount))} ETH
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Match data has been cleaned up on-chain
            </p>
          </CardContent>
        </Card>
      )
    }
    
    return (
      <Card className="h-fit sticky top-8">
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          {fetchError ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Match not found</p>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
                <p className="text-sm text-red-500 font-semibold mb-1">Error:</p>
                <p className="text-xs text-red-500/90">{fetchError}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Match ID: {matchId}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Match not found</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const statusLabels = ['Open', 'Active', 'Finalized']
  const statusLabel = statusLabels[matchData.status] || 'Unknown'
  const tokenDisplay = matchData.token === zeroAddress ? 'ETH' : `${matchData.token.slice(0, 6)}...${matchData.token.slice(-4)}`
  const isPlayer = matchData.players.some(p => p.toLowerCase() === address?.toLowerCase())
  const canJoin = matchData.status === MatchStatus.Open && !isPlayer && matchData.players.length < Number(matchData.maxPlayers)
  const canWithdraw = matchData.status === MatchStatus.Open && isPlayer
  const canActivate = matchData.status === MatchStatus.Open && matchData.players.length >= 2
  const canFinalize = matchData.status === MatchStatus.Active

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
    <Card className="h-fit sticky top-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Match #{matchId}</CardTitle>
          <Badge className={getStatusColor(statusLabel)}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Stake Amount</span>
            <span className="font-semibold">{formatEther(matchData.stakeAmount)} {tokenDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Prize</span>
            <span className="font-semibold">
              {formatEther(matchData.stakeAmount * BigInt(matchData.players.length))} {tokenDisplay}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Players</span>
            <span className="font-semibold">
              {matchData.players.length}/{Number(matchData.maxPlayers)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Players</h4>
          <div className="space-y-2">
            {matchData.players.map((player: string, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <span className="text-sm font-mono">
                  {player.slice(0, 6)}...{player.slice(-4)}
                  {player.toLowerCase() === address?.toLowerCase() && ' (You)'}
                </span>
                {matchData.winner !== zeroAddress && matchData.winner.toLowerCase() === player.toLowerCase() && (
                  <Trophy className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {matchData.winner !== zeroAddress && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h4 className="font-semibold text-yellow-500">Winner</h4>
            </div>
            <p className="text-sm font-mono">
              {matchData.winner.slice(0, 6)}...{matchData.winner.slice(-4)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Prize: {formatEther(matchData.stakeAmount * BigInt(matchData.players.length))} {tokenDisplay}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {/* Show approval status for custom tokens when user can join */}
          {canJoin && !isNativeToken && matchData.token !== zeroAddress && (
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-start gap-2">
                {isApproveSuccess || !needsApproval ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {isApproveSuccess || !needsApproval ? 'Token Approved' : 'Token Approval Required'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isApproveSuccess || !needsApproval
                      ? 'You can now join the match'
                      : 'Approve the contract to spend your tokens'}
                  </p>
                </div>
              </div>
              {needsApproval && (
                <Button
                  onClick={approve}
                  disabled={isApprovePending || isApproveConfirming}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {isApprovePending ? 'Confirming...' : isApproveConfirming ? 'Approving...' : 'Approve Token'}
                </Button>
              )}
            </div>
          )}

          {canJoin && (
            <Button 
              className="w-full"
              onClick={handleJoinMatch}
              disabled={isJoining || isJoinConfirming || needsApproval}
            >
              {isJoining ? 'Confirming...' : isJoinConfirming ? 'Joining...' : 'Join Match'}
            </Button>
          )}
          {canWithdraw && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleWithdrawStake}
              disabled={isWithdrawing || isWithdrawConfirming}
            >
              {isWithdrawing ? 'Confirming...' : isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw Stake'}
            </Button>
          )}

          {/* Activate Match Button - Only for Open matches with 2+ players */}
          {canActivate && (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-500">Ready to Activate</p>
                    <p className="text-xs text-blue-500/80 mt-1">
                      Match has {matchData.players.length} players. Activation will lock all stakes.
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={handleActivateMatch}
                disabled={isActivating}
                variant="default"
              >
                {isActivating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Activate Match
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Finalize Match Button - Only for Active matches */}
          {canFinalize && (
            <div className="space-y-2">
              {!showWinnerPicker ? (
                <>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-blue-500">
                        Match is active. Select finalize with app selected winner.
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => setShowWinnerPicker(true)}
                    variant="default"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Finalize Match
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-start gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Select Winner</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose the player who won this match
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {matchData.players.map((player: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedWinner(player)}
                          className={`w-full p-3 rounded-md border text-left transition-colors ${
                            selectedWinner === player
                              ? 'bg-yellow-500/20 border-yellow-500/50'
                              : 'bg-muted/50 border-transparent hover:border-muted-foreground/20'
                          }`}
                        >
                          <span className="text-sm font-mono">
                            {player.slice(0, 6)}...{player.slice(-4)}
                            {player.toLowerCase() === address?.toLowerCase() && ' (You)'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowWinnerPicker(false)
                        setSelectedWinner(null)
                      }}
                      disabled={isFinalizing}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleFinalizeMatch}
                      disabled={!selectedWinner || isFinalizing}
                    >
                      {isFinalizing ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {isJoinSuccess && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500">
                Successfully joined match!
              </p>
            </div>
          )}
          {joinError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                Error: {joinError.message}
              </p>
            </div>
          )}
          {approveError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                Approval Error: {approveError.message}
              </p>
            </div>
          )}
          
          {isWithdrawSuccess && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500">
                Successfully withdrawn stake!
              </p>
            </div>
          )}
          {withdrawError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                Error: {withdrawError.message}
              </p>
            </div>
          )}

          {activateSuccess && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500">
                Successfully activated match!
              </p>
            </div>
          )}
          {activateError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                Error: {activateError}
              </p>
            </div>
          )}

          {finalizeSuccess && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm font-semibold text-green-500">
                  Match Finalized Successfully!
                </p>
              </div>
              {finalizeResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Winner:</span>
                    <span className="font-mono font-medium">
                      {finalizeResult.winner.slice(0, 6)}...{finalizeResult.winner.slice(-4)}
                      {finalizeResult.winner.toLowerCase() === address?.toLowerCase() && ' (You)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Prize Pool:</span>
                    <span className="font-medium">
                      {formatEther(BigInt(finalizeResult.totalPrize))} {tokenDisplay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Winner Received:</span>
                    <span className="font-semibold text-green-600">
                      {formatEther(BigInt(finalizeResult.winnerAmount))} {tokenDisplay}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-green-500/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fees Deducted:</span>
                      <span className="text-muted-foreground">
                        {formatEther(BigInt(finalizeResult.totalPrize) - BigInt(finalizeResult.winnerAmount))} {tokenDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {finalizeError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">
                Error: {finalizeError}
              </p>
            </div>
          )}

          {statusLabel === 'Open' && !canJoin && !isPlayer && !canActivate && (
            <p className="text-xs text-center text-muted-foreground">
              Match needs at least 2 players
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
