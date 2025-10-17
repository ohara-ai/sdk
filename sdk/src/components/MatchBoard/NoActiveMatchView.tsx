import { zeroAddress, formatEther } from 'viem'
import { Coins, Users, Plus, Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { MatchInfo } from './types'

interface NoActiveMatchViewProps {
  matches: MatchInfo[]
  isLoadingMatches: boolean
  matchIdsError: any
  matchIds: readonly bigint[] | undefined
  showCreateForm: boolean
  stakeAmount: string
  maxPlayers: string
  presetMaxPlayers?: number
  isCreating: boolean
  isCreateConfirming: boolean
  isCreateSuccess: boolean
  isJoining: boolean
  isJoinConfirming: boolean
  isJoinSuccess: boolean
  onCreateMatch: (e: React.FormEvent) => void
  onJoinMatch: (matchId: bigint, stake: bigint) => void
  onStakeChange: (value: string) => void
  onMaxPlayersChange: (value: string) => void
  onShowCreateForm: (show: boolean) => void
}

/** View when user has no active match - shows list of available matches */
export function NoActiveMatchView({
  matches,
  isLoadingMatches,
  matchIdsError,
  matchIds,
  showCreateForm,
  stakeAmount,
  maxPlayers,
  presetMaxPlayers,
  isCreating,
  isCreateConfirming,
  isCreateSuccess,
  isJoining,
  isJoinConfirming,
  isJoinSuccess,
  onCreateMatch,
  onJoinMatch,
  onStakeChange,
  onMaxPlayersChange,
  onShowCreateForm,
}: NoActiveMatchViewProps) {
  const ethMatches = matches.filter((m) => m.token === zeroAddress)
  const erc20Matches = matches.filter((m) => m.token !== zeroAddress)

  if (showCreateForm) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create New Match</h3>
          <button
            onClick={() => onShowCreateForm(false)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
        <form onSubmit={onCreateMatch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stake Amount (ETH)
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.001"
                min="0"
                value={stakeAmount}
                onChange={(e) => onStakeChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Players {presetMaxPlayers && <span className="text-xs text-gray-500">(preset by game)</span>}
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(e) => onMaxPlayersChange(e.target.value)}
                disabled={!!presetMaxPlayers}
                className={cn(
                  "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  presetMaxPlayers && "bg-gray-100 cursor-not-allowed text-gray-600"
                )}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating || isCreateConfirming}
            className={cn(
              'w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors',
              isCreating || isCreateConfirming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isCreating || isCreateConfirming ? 'Creating Match...' : 'Create Match'}
          </button>

          {isCreateSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Match created successfully!
            </div>
          )}
        </form>
      </>
    )
  }

  return (
    <>
      {matchIdsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="font-semibold mb-1 text-sm">Error Loading Matches</div>
          <div className="text-xs font-mono">{matchIdsError.message || 'Unknown error'}</div>
        </div>
      )}

      <div className="space-y-6 max-h-[500px] overflow-y-auto">
        {isLoadingMatches ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">
              No open matches available.
            </div>
            {matchIds && matchIds.length > 0 ? (
              <div className="text-xs text-gray-400">
                Found {matchIds.length} total matches, but none are open.
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Create the first match to get started!
              </div>
            )}
          </div>
        ) : (
          <>
            {ethMatches.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  ETH Matches ({ethMatches.length})
                </h3>
                <div className="space-y-2">
                  {ethMatches.map((match) => (
                    <button
                      key={match.id.toString()}
                      onClick={() => onJoinMatch(match.id, match.stakeAmount)}
                      disabled={isJoining || isJoinConfirming}
                      className={cn(
                        "w-full p-4 border border-gray-200 rounded-lg text-left transition-all",
                        isJoining || isJoinConfirming
                          ? "cursor-not-allowed opacity-50"
                          : "hover:border-blue-400 hover:shadow-md cursor-pointer hover:bg-blue-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          Match #{match.id.toString()}
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatEther(match.stakeAmount)} ETH
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {match.players.length}/{match.maxPlayers.toString()} players
                        </div>
                        <div className="text-blue-600 font-semibold">
                          Click to join →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {erc20Matches.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  ERC20 Token Matches ({erc20Matches.length})
                </h3>
                <div className="space-y-2">
                  {erc20Matches.map((match) => (
                    <button
                      key={match.id.toString()}
                      onClick={() => onJoinMatch(match.id, match.stakeAmount)}
                      disabled={isJoining || isJoinConfirming}
                      className={cn(
                        "w-full p-4 border border-gray-200 rounded-lg text-left transition-all",
                        isJoining || isJoinConfirming
                          ? "cursor-not-allowed opacity-50"
                          : "hover:border-purple-400 hover:shadow-md cursor-pointer hover:bg-purple-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          Match #{match.id.toString()}
                        </div>
                        <div className="text-lg font-bold text-purple-600">
                          {match.stakeAmount.toString()} Tokens
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {match.players.length}/{match.maxPlayers.toString()} players
                        </div>
                        <div className="text-purple-600 font-semibold">
                          Click to join →
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        Token: {match.token}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={() => onShowCreateForm(true)}
          style={{ backgroundColor: '#16a34a', color: 'white' }}
          className="w-full py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Create New Match
        </button>
      </div>

      {isJoinSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Successfully joined the match!
        </div>
      )}
    </>
  )
}
