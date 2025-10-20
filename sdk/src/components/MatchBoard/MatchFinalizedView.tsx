import { formatEther } from 'viem'
import { Trophy, Medal, XCircle, CheckCircle2, PartyPopper, Frown } from 'lucide-react'
import { MatchInfo } from './types'

interface MatchFinalizedViewProps {
  matchId: bigint
  matchInfo: MatchInfo
  userAddress: `0x${string}` | undefined
  onDismiss?: () => void
}

/** View when match is finalized (showing winner/loser feedback) */
export function MatchFinalizedView({
  matchId,
  matchInfo,
  userAddress,
  onDismiss,
}: MatchFinalizedViewProps) {
  const isWinner = matchInfo.winner && userAddress && 
    matchInfo.winner.toLowerCase() === userAddress.toLowerCase()
  const isPlayer = matchInfo.players.some(
    (p) => p.toLowerCase() === userAddress?.toLowerCase()
  )
  const totalPrize = matchInfo.maxPlayers * matchInfo.stakeAmount

  return (
    <div className="space-y-4">
      {/* Winner Banner */}
      {isWinner ? (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 text-white rounded-lg p-6 shadow-lg animate-in fade-in duration-500">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative">
              <Trophy className="w-16 h-16 animate-bounce" />
              <PartyPopper className="w-8 h-8 absolute -top-2 -right-2 animate-spin-slow" />
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">🎉 Victory! 🎉</div>
              <div className="text-xl font-semibold">You Won the Match!</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mt-2">
              <div className="text-sm opacity-90 mb-1">Prize Amount</div>
              <div className="text-3xl font-bold tabular-nums">
                {formatEther(totalPrize)} ETH
              </div>
            </div>
          </div>
        </div>
      ) : isPlayer ? (
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg p-6 shadow-lg">
          <div className="flex flex-col items-center text-center gap-4">
            <Frown className="w-16 h-16 opacity-75" />
            <div>
              <div className="text-2xl font-bold mb-2">Match Lost</div>
              <div className="text-lg">Better luck next time!</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-2">
              <div className="text-sm opacity-75 mb-1">Stakes Lost</div>
              <div className="text-2xl font-bold tabular-nums">
                {formatEther(matchInfo.stakeAmount)} ETH
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <Trophy className="w-12 h-12" />
            <div>
              <div className="text-xl font-bold">Match Completed</div>
              <div className="text-sm opacity-90">Spectating this match</div>
            </div>
          </div>
        </div>
      )}

      {/* Match Summary */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Medal className="w-4 h-4" />
          Match Summary
        </h3>
        
        <div className="space-y-3">
          {/* Match ID and Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Match ID</div>
            <div className="font-mono text-sm font-semibold">#{matchId.toString()}</div>
          </div>

          {/* Total Prize Pool */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Prize Pool
            </div>
            <div className="text-sm font-bold text-yellow-900 tabular-nums">
              {formatEther(totalPrize)} ETH
            </div>
          </div>

          {/* Winner */}
          {matchInfo.winner && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-700 mb-1">Winner</div>
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm text-green-900">
                  {matchInfo.winner.slice(0, 6)}...{matchInfo.winner.slice(-4)}
                </div>
                {isWinner && (
                  <div className="flex items-center gap-1 text-green-700 text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    You
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Players */}
          <div className="space-y-2">
            <div className="text-xs text-gray-600 font-semibold">Participants</div>
            {matchInfo.players.map((player, index) => {
              const isThisPlayer = player.toLowerCase() === userAddress?.toLowerCase()
              const isWinnerPlayer = player.toLowerCase() === matchInfo.winner.toLowerCase()
              
              return (
                <div
                  key={player}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    isWinnerPlayer 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isWinnerPlayer 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="font-mono text-xs text-gray-800">
                      {player.slice(0, 6)}...{player.slice(-4)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isThisPlayer && (
                      <div className="text-xs text-blue-600 font-semibold">You</div>
                    )}
                    {isWinnerPlayer ? (
                      <Trophy className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          Close Match Summary
        </button>
      )}

      <div className="text-center">
        <div className="text-xs text-gray-500">Match finalized on-chain</div>
        <div className="text-xs text-gray-400 mt-1">All stakes have been distributed</div>
      </div>
    </div>
  )
}
