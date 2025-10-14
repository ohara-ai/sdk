'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber, useChainId } from 'wagmi'
import { formatEther, zeroAddress, parseEther } from 'viem'
import { GAME_MATCH_ABI, getGameMatchAddress, MatchStatus } from '@/lib/contracts/gameMatch'
import { useTokenApproval } from '@/lib/hooks/useTokenApproval'

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
  const contractAddress = getGameMatchAddress(chainId)
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [isLoadingMatch, setIsLoadingMatch] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

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

        const [token, stakeAmount, maxPlayers, players, status, winner] = result as [
          string,
          bigint,
          bigint,
          string[],
          number,
          string
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
          token,
          stakeAmount,
          maxPlayers,
          players,
          status,
          winner,
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
  }, [matchId, contractAddress, blockNumber, isJoinSuccess, isWithdrawSuccess])

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

          {statusLabel === 'Open' && !canJoin && !isPlayer && (
            <p className="text-xs text-center text-muted-foreground">
              Match is full
            </p>
          )}
          {statusLabel === 'Active' && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-blue-500">
                  Match is active. Waiting for controller to finalize.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
