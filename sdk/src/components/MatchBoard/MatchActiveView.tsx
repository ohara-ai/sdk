import { formatEther } from 'viem'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { MatchInfo } from './types'

interface MatchActiveViewProps {
  matchId: bigint
  matchInfo: MatchInfo | null
  isLoadingMatch: boolean
  isActivating: boolean
  userAddress: `0x${string}` | undefined
  onRetryFetch: () => void
}

/** View when match is activated (no more withdrawals allowed) */
export function MatchActiveView({
  matchId,
  matchInfo,
  isLoadingMatch,
  isActivating,
  userAddress,
  onRetryFetch,
}: MatchActiveViewProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isActivating ? (
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-green-600" />
              )}
              <div>
                <div className="text-sm font-semibold text-green-900">
                  Match #{matchId.toString()}
                </div>
                <div className="text-xs text-green-700">
                  {isActivating ? 'Activating match...' : 'Active - Game in progress'}
                </div>
              </div>
            </div>
            {matchInfo && (
              <div className="flex flex-col items-end">
                <div className="text-sm font-bold text-green-600">
                  {formatEther(matchInfo.stakeAmount)} ETH/player
                </div>
                <div className="text-xs text-green-500">
                  Total Pool: {formatEther(matchInfo.maxPlayers * matchInfo.stakeAmount)} ETH
                </div>
              </div>
            )}
          </div>

          {matchInfo && (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">All {matchInfo.maxPlayers.toString()} players ready</span>
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
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
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
      </div>
    </>
  )
}
