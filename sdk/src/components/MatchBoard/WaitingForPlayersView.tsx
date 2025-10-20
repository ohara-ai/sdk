import { formatEther } from 'viem'
import { Clock, Users, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import { MatchInfo } from './types'

interface WaitingForPlayersViewProps {
  matchId: bigint
  matchInfo: MatchInfo | null
  isLoadingMatch: boolean
  matchCreated: boolean
  isWithdrawing: boolean
  isWithdrawConfirming: boolean
  userAddress: `0x${string}` | undefined
  countdownSeconds: number | null
  isActivating: boolean
  onWithdraw: () => void
  onRetryFetch: () => void
}

/** View when user joined a match that's still Open (waiting for players) */
export function WaitingForPlayersView({
  matchId,
  matchInfo,
  isLoadingMatch,
  matchCreated,
  isWithdrawing,
  isWithdrawConfirming,
  userAddress,
  countdownSeconds,
  isActivating,
  onWithdraw,
  onRetryFetch,
}: WaitingForPlayersViewProps) {
  const isMatchFull = matchInfo && matchInfo.players.length === Number(matchInfo.maxPlayers)
  const wasFullNowNot = countdownSeconds !== null && !isMatchFull
  
  return (
    <>
      <div className="space-y-4">
        {/* Player Left Warning */}
        {wasFullNowNot && (
          <div className="border-2 border-orange-500 bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm font-semibold text-orange-900">Player Left</div>
                <div className="text-xs text-orange-700">
                  Waiting for another player to join...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Countdown Banner */}
        {countdownSeconds !== null && countdownSeconds > 0 && !isActivating && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Match Starting Soon</div>
                  <div className="text-xs opacity-90">
                    Game begins in {countdownSeconds} seconds
                  </div>
                </div>
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {countdownSeconds}
              </div>
            </div>
          </div>
        )}

        {/* Activating Banner */}
        {isActivating && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="font-semibold">Activating match...</div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-semibold text-blue-900">
                  Match #{matchId.toString()}
                </div>
                <div className="text-xs text-blue-700">
                  {matchCreated ? 'Created - Waiting for players' : 'Waiting for players'}
                </div>
              </div>
            </div>
            {matchInfo && (
              <div className="flex flex-col items-end">
                <div className="text-sm font-bold text-blue-600">
                  {formatEther(matchInfo.stakeAmount)} ETH/player
                </div>
                <div className="text-xs text-blue-500">
                  {formatEther(BigInt(matchInfo.players.length) * matchInfo.stakeAmount)} / {formatEther(matchInfo.maxPlayers * matchInfo.stakeAmount)} ETH total
                </div>
              </div>
            )}
          </div>

          {matchInfo && (
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Users className="w-4 h-4" />
              <span>{matchInfo.players.length}/{matchInfo.maxPlayers.toString()} players joined</span>
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Match Participants</h3>
          {!matchInfo && isLoadingMatch ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <div className="text-sm text-gray-500">Loading match details...</div>
            </div>
          ) : matchInfo && matchInfo.players.length > 0 ? (
            <div className="space-y-2">
              {matchInfo.players.map((player, index) => (
                <div
                  key={player}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-mono text-gray-800">
                        {player.slice(0, 6)}...{player.slice(-4)}
                      </div>
                      <div className="flex items-center gap-2">
                        {player.toLowerCase() === userAddress?.toLowerCase() && (
                          <div className="text-xs text-blue-600 font-semibold">You</div>
                        )}
                        {index === 0 && (
                          <div className="text-xs text-purple-600 font-semibold">Creator</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {formatEther(matchInfo.stakeAmount)} ETH
                        </div>
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Number(matchInfo.maxPlayers) - matchInfo.players.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-400">Waiting for player...</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <div className="text-sm text-gray-500">Loading participants...</div>
              <button
                onClick={onRetryFetch}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Withdraw Button */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={onWithdraw}
            disabled={isWithdrawing || isWithdrawConfirming || isActivating}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border",
              (isWithdrawing || isWithdrawConfirming || isActivating)
                ? "!bg-gray-300 !text-gray-700 cursor-not-allowed !border-gray-400"
                : "!bg-red-600 !text-white hover:!bg-red-700 !border-red-600"
            )}
          >
            <XCircle className="w-5 h-5" />
            {isWithdrawing || isWithdrawConfirming ? 'Withdrawing...' : 
             isActivating ? 'Match Activating...' : 
             'Leave Match & Recover Stake'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            {isActivating 
              ? 'Match is activating - withdrawal disabled' 
              : isMatchFull
                ? 'Match is full - you can still withdraw before activation'
                : 'You can leave before the match is activated'}
          </p>
        </div>
      </div>
    </>
  )
}
