import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient, useWatchContractEvent } from 'wagmi'
import { parseEther, zeroAddress, formatEther, decodeEventLog } from 'viem'
import { GAME_MATCH_ABI, MatchStatus } from '../abis/gameMatch'
import { cn } from '../utils/cn'
import { Coins, Users, Plus, Loader2, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
import { MATCH_BOARD_METADATA } from '../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../context/OnchainContext'
import { ContractType } from '../types/contracts'

export interface MatchBoardProps {
  /** GameMatch contract address. If not provided, will be resolved from OharaAiProvider context */
  gameMatchAddress?: `0x${string}`
  /** Preset number of max players for the game. If provided, users cannot change this value. */
  presetMaxPlayers?: number
  onMatchCreated?: (matchId: bigint) => void
  onMatchJoined?: (matchId: bigint) => void
  className?: string
}

interface MatchInfo {
  id: bigint
  token: `0x${string}`
  stakeAmount: bigint
  maxPlayers: bigint
  players: readonly `0x${string}`[]
  status: number
  winner: `0x${string}`
  createdAt: bigint
}

// ==================== SUB-COMPONENTS ====================

/** View when user has no active match - shows list of available matches */
function NoActiveMatchView({
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
}: {
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
}) {
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

/** View when user joined a match that's still Open (waiting for players) */
function WaitingForPlayersView({
  matchId,
  matchInfo,
  isLoadingMatch,
  matchCreated,
  isWithdrawing,
  isWithdrawConfirming,
  userAddress,
  onWithdraw,
  onRetryFetch,
}: {
  matchId: bigint
  matchInfo: MatchInfo | null
  isLoadingMatch: boolean
  matchCreated: boolean
  isWithdrawing: boolean
  isWithdrawConfirming: boolean
  userAddress: `0x${string}` | undefined
  onWithdraw: () => void
  onRetryFetch: () => void
}) {
  return (
    <>
      <div className="space-y-4">
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
            disabled={isWithdrawing || isWithdrawConfirming}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2",
              isWithdrawing || isWithdrawConfirming
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            <XCircle className="w-5 h-5" />
            {isWithdrawing || isWithdrawConfirming ? 'Withdrawing...' : 'Leave Match & Recover Stake'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            You can leave before the match is activated
          </p>
        </div>
      </div>
    </>
  )
}

/** View when match is activated (no more withdrawals allowed) */
function MatchActiveView({
  matchId,
  matchInfo,
  isLoadingMatch,
  isActivating,
  userAddress,
  onRetryFetch,
}: {
  matchId: bigint
  matchInfo: MatchInfo | null
  isLoadingMatch: boolean
  isActivating: boolean
  userAddress: `0x${string}` | undefined
  onRetryFetch: () => void
}) {
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

// ==================== MAIN COMPONENT ====================

export function MatchBoard({
  gameMatchAddress: gameMatchAddressProp,
  presetMaxPlayers,
  onMatchCreated,
  onMatchJoined,
  className,
}: MatchBoardProps) {
  // Auto-register this component for dependency tracking
  useComponentRegistration('MatchBoard')
  
  // Get contract address from context if not provided
  const { getContractAddress } = useOharaAi()
  const gameMatchAddress = gameMatchAddressProp || getContractAddress(ContractType.GAME_MATCH)
  
  const { address } = useAccount()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(presetMaxPlayers?.toString() || '2')
  const [matches, setMatches] = useState<MatchInfo[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [userJoinedMatchId, setUserJoinedMatchId] = useState<bigint | null>(null)
  const [currentMatchInfo, setCurrentMatchInfo] = useState<MatchInfo | null>(null)
  const [matchCreated, setMatchCreated] = useState(false)
  const [isLoadingCurrentMatch, setIsLoadingCurrentMatch] = useState(false)

  // Fetch active match IDs
  const { data: matchIds, refetch: refetchMatchIds, error: matchIdsError } = useReadContract({
    address: gameMatchAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'getActiveMatchIds',
    args: [0n, 100n], // Fetch up to 100 matches
    query: {
      enabled: !!gameMatchAddress && !!address,
    },
  })

  // Debug logging
  useEffect(() => {
    console.log('🎮 MatchBoard Debug:', {
      gameMatchAddress,
      address,
      matchIds,
      matchIdsType: typeof matchIds,
      matchIdsArray: matchIds ? Array.from(matchIds as any) : null,
      matchIdsLength: matchIds ? (matchIds as readonly bigint[]).length : 0,
      matchIdsError,
      hasGameMatch: !!gameMatchAddress,
      hasAddress: !!address,
      showCreateForm,
      userJoinedMatchId,
      matchesCount: matches.length,
      isLoadingMatches,
    })
  }, [gameMatchAddress, address, matchIds, matchIdsError, showCreateForm, userJoinedMatchId, matches, isLoadingMatches])

  const {
    writeContract: createMatch,
    data: createHash,
    isPending: isCreating,
  } = useWriteContract()

  const {
    writeContract: joinMatch,
    data: joinHash,
    isPending: isJoining,
  } = useWriteContract()

  const {
    writeContract: withdrawStake,
    data: withdrawHash,
    isPending: isWithdrawing,
  } = useWriteContract()

  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess, data: createReceipt } =
    useWaitForTransactionReceipt({ hash: createHash })

  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess, data: joinReceipt } =
    useWaitForTransactionReceipt({ hash: joinHash })

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash })

  const publicClient = usePublicClient()

  // Fetch match details when matchIds change
  useEffect(() => {
    async function fetchMatches() {
      if (!matchIds || !gameMatchAddress || !address || !publicClient) {
        setMatches([])
        return
      }

      setIsLoadingMatches(true)
      console.log('🔍 Fetching matches for IDs:', matchIds)
      try {
        const matchDetails = await Promise.all(
          (matchIds as readonly bigint[]).map(async (matchId) => {
            console.log('🔍 Fetching match #', matchId.toString())
            const result = await publicClient.readContract({
              address: gameMatchAddress,
              abi: GAME_MATCH_ABI,
              functionName: 'getMatch',
              args: [matchId],
            })
            
            console.log('📊 Match data for #' + matchId.toString() + ':', {
              token: result[0],
              stakeAmount: result[1]?.toString(),
              maxPlayers: result[2]?.toString(),
              playersCount: (result[3] as any)?.length,
              status: result[4],
              winner: result[5],
              createdAt: result[6]?.toString(),
            })
            
            return {
              id: matchId,
              token: result[0] as `0x${string}`,
              stakeAmount: result[1] as bigint,
              maxPlayers: result[2] as bigint,
              players: result[3] as readonly `0x${string}`[],
              status: result[4] as number,
              winner: result[5] as `0x${string}`,
              createdAt: result[6] as bigint,
            } as MatchInfo
          })
        )

        // Filter to only show Open matches and check if user has joined any
        const openMatches = matchDetails.filter((m) => m.status === 0)
        const joinedMatch = matchDetails.find((m) => 
          m.players.some((p) => p.toLowerCase() === address.toLowerCase())
        )
        
        console.log('✅ Processed matches:', {
          totalMatches: matchDetails.length,
          openMatches: openMatches.length,
          joinedMatchId: joinedMatch?.id.toString(),
          allStatuses: matchDetails.map(m => ({ id: m.id.toString(), status: m.status })),
        })
        
        setMatches(openMatches)
        setUserJoinedMatchId(joinedMatch ? joinedMatch.id : null)
      } catch (error) {
        console.error('❌ Error fetching matches:', error)
        setMatches([])
      } finally {
        setIsLoadingMatches(false)
      }
    }

    fetchMatches()
  }, [matchIds, gameMatchAddress, address, publicClient])

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stakeAmount || !maxPlayers || !gameMatchAddress) return

    try {
      createMatch({
        address: gameMatchAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'createMatch',
        args: [zeroAddress, parseEther(stakeAmount), BigInt(maxPlayers)],
        value: parseEther(stakeAmount),
      })
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  const handleJoinMatch = async (matchId: bigint, stake: bigint) => {
    if (!gameMatchAddress) return

    try {
      joinMatch({
        address: gameMatchAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'joinMatch',
        args: [matchId],
        value: stake,
      })
    } catch (error) {
      console.error('Error joining match:', error)
    }
  }

  const handleWithdrawStake = async () => {
    if (!gameMatchAddress || userJoinedMatchId === null) return

    try {
      withdrawStake({
        address: gameMatchAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'withdrawStake',
        args: [userJoinedMatchId],
      })
    } catch (error) {
      console.error('Error withdrawing stake:', error)
    }
  }

  // Extract match ID from transaction receipt and notify
  useEffect(() => {
    if (isCreateSuccess && createReceipt) {
      // Extract matchId from MatchCreated event
      const matchCreatedEvent = createReceipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: GAME_MATCH_ABI,
            data: log.data,
            topics: log.topics,
          })
          return decoded.eventName === 'MatchCreated'
        } catch {
          return false
        }
      })

      if (matchCreatedEvent) {
        try {
          const decoded = decodeEventLog({
            abi: GAME_MATCH_ABI,
            data: matchCreatedEvent.data,
            topics: matchCreatedEvent.topics,
          })
          const matchId = (decoded.args as any).matchId as bigint
          console.log('✅ Match created with ID:', matchId.toString())
          setUserJoinedMatchId(matchId)
          setMatchCreated(true)
          onMatchCreated?.(matchId)
          refetchMatchIds()
        } catch (error) {
          console.error('Error decoding MatchCreated event:', error)
        }
      }
      
      setStakeAmount('')
      setMaxPlayers(presetMaxPlayers?.toString() || '2')
      setShowCreateForm(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateSuccess, createReceipt])

  // Extract match ID from join receipt and notify
  useEffect(() => {
    if (isJoinSuccess && joinReceipt) {
      // Extract matchId from PlayerJoined event
      const playerJoinedEvent = joinReceipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: GAME_MATCH_ABI,
            data: log.data,
            topics: log.topics,
          })
          return decoded.eventName === 'PlayerJoined'
        } catch {
          return false
        }
      })

      if (playerJoinedEvent) {
        try {
          const decoded = decodeEventLog({
            abi: GAME_MATCH_ABI,
            data: playerJoinedEvent.data,
            topics: playerJoinedEvent.topics,
          })
          const matchId = (decoded.args as any).matchId as bigint
          console.log('✅ Joined match with ID:', matchId.toString())
          onMatchJoined?.(matchId)
        } catch (error) {
          console.error('Error decoding PlayerJoined event:', error)
        }
      }
      
      refetchMatchIds()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoinSuccess, joinReceipt])

  // Handle withdraw success
  useEffect(() => {
    if (isWithdrawSuccess) {
      console.log('✅ Successfully withdrew from match')
      setUserJoinedMatchId(null)
      setCurrentMatchInfo(null)
      setMatchCreated(false)
      refetchMatchIds()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWithdrawSuccess])

  // Watch for PlayerJoined events to update match info in real-time
  useWatchContractEvent({
    address: gameMatchAddress,
    abi: GAME_MATCH_ABI,
    eventName: 'PlayerJoined',
    onLogs(logs) {
      console.log('🔔 PlayerJoined event received:', logs)
      // Refetch match data when someone joins
      if (userJoinedMatchId !== null) {
        // Add small delay to ensure blockchain state is updated
        setTimeout(() => {
          fetchCurrentMatchInfo()
        }, 300)
      }
      refetchMatchIds()
    },
    enabled: !!gameMatchAddress && userJoinedMatchId !== null,
  })

  // Watch for MatchActivated events
  useWatchContractEvent({
    address: gameMatchAddress,
    abi: GAME_MATCH_ABI,
    eventName: 'MatchActivated',
    onLogs(logs) {
      console.log('🔔 MatchActivated event received:', logs)
      // Update current match info to reflect new status
      if (userJoinedMatchId !== null) {
        setTimeout(() => {
          fetchCurrentMatchInfo()
        }, 300)
      }
      refetchMatchIds()
    },
    enabled: !!gameMatchAddress && userJoinedMatchId !== null,
  })

  // Fetch current match info when user is in a match
  const fetchCurrentMatchInfo = async () => {
    if (userJoinedMatchId === null || !gameMatchAddress || !publicClient) {
      console.log('⚠️ Cannot fetch match info:', { 
        matchId: userJoinedMatchId?.toString() || 'null',
        hasAddress: !!gameMatchAddress, 
        hasClient: !!publicClient 
      })
      return
    }

    setIsLoadingCurrentMatch(true)
    console.log('🔍 Fetching match info for match ID:', userJoinedMatchId.toString())
    
    try {
      const result = await publicClient.readContract({
        address: gameMatchAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'getMatch',
        args: [userJoinedMatchId],
      })
      
      const matchInfo: MatchInfo = {
        id: userJoinedMatchId,
        token: result[0] as `0x${string}`,
        stakeAmount: result[1] as bigint,
        maxPlayers: result[2] as bigint,
        players: result[3] as readonly `0x${string}`[],
        status: result[4] as number,
        winner: result[5] as `0x${string}`,
        createdAt: result[6] as bigint,
      }
      
      setCurrentMatchInfo(matchInfo)
      console.log('✅ Current match info loaded:', {
        matchId: matchInfo.id.toString(),
        players: matchInfo.players.length,
        maxPlayers: matchInfo.maxPlayers.toString(),
        stakeAmount: formatEther(matchInfo.stakeAmount),
        status: matchInfo.status,
      })
      
      // Auto-activate when match is full
      if (matchInfo.players.length === Number(matchInfo.maxPlayers) && matchInfo.status === 0) {
        console.log('🎮 Match is full! Auto-activating...')
        activateMatch(userJoinedMatchId)
      }
    } catch (error) {
      console.error('❌ Error fetching current match info:', error)
      setCurrentMatchInfo(null)
    } finally {
      setIsLoadingCurrentMatch(false)
    }
  }

  // Auto-activate match when it's full (via API)
  const [isActivating, setIsActivating] = useState(false)

  const activateMatch = async (matchId: bigint) => {
    if (!gameMatchAddress || isActivating) return

    setIsActivating(true)
    try {
      const response = await fetch('/api/activate-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: matchId.toString(),
          contractAddress: gameMatchAddress,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate match')
      }
      
      console.log('✅ Match activated:', data)
    } catch (error) {
      console.error('Error activating match:', error)
    } finally {
      setIsActivating(false)
    }
  }

  // Fetch current match info when userJoinedMatchId changes
  useEffect(() => {
    if (userJoinedMatchId !== null && gameMatchAddress && publicClient) {
      // Small delay to ensure blockchain has processed the transaction
      const timer = setTimeout(() => {
        fetchCurrentMatchInfo()
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setCurrentMatchInfo(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userJoinedMatchId, gameMatchAddress, publicClient])

  // Check gameMatchAddress FIRST to ensure consistent SSR/client rendering
  if (!gameMatchAddress) {
    return (
      <div className={className}>
        <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="font-semibold mb-1">Configuration Error</div>
          <div className="text-sm">GameMatch contract address not configured. Please set NEXT_PUBLIC_GAME_MATCH_INSTANCE or provide gameMatchAddress prop.</div>
        </div>
      </div>
    )
  }

  if (!address) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-gray-500">
          Please connect your wallet to create or join matches
        </div>
      </div>
    )
  }

  // Determine which view to show based on match state
  const renderView = () => {
    // If user has joined a match
    if (userJoinedMatchId !== null && currentMatchInfo) {
      // Match is still Open - waiting for players
      if (currentMatchInfo.status === MatchStatus.Open) {
        return (
          <WaitingForPlayersView
            matchId={userJoinedMatchId}
            matchInfo={currentMatchInfo}
            isLoadingMatch={isLoadingCurrentMatch}
            matchCreated={matchCreated}
            isWithdrawing={isWithdrawing}
            isWithdrawConfirming={isWithdrawConfirming}
            userAddress={address}
            onWithdraw={handleWithdrawStake}
            onRetryFetch={fetchCurrentMatchInfo}
          />
        )
      }
      
      // Match is Active or Finalized
      if (currentMatchInfo.status === MatchStatus.Active || currentMatchInfo.status === MatchStatus.Finalized) {
        return (
          <MatchActiveView
            matchId={userJoinedMatchId}
            matchInfo={currentMatchInfo}
            isLoadingMatch={isLoadingCurrentMatch}
            isActivating={isActivating}
            userAddress={address}
            onRetryFetch={fetchCurrentMatchInfo}
          />
        )
      }
    }
    
    // No active match - show match list
    return (
      <NoActiveMatchView
        matches={matches}
        isLoadingMatches={isLoadingMatches}
        matchIdsError={matchIdsError}
        matchIds={matchIds as readonly bigint[] | undefined}
        showCreateForm={showCreateForm}
        stakeAmount={stakeAmount}
        maxPlayers={maxPlayers}
        presetMaxPlayers={presetMaxPlayers}
        isCreating={isCreating}
        isCreateConfirming={isCreateConfirming}
        isCreateSuccess={isCreateSuccess}
        isJoining={isJoining}
        isJoinConfirming={isJoinConfirming}
        isJoinSuccess={isJoinSuccess}
        onCreateMatch={handleCreateMatch}
        onJoinMatch={handleJoinMatch}
        onStakeChange={setStakeAmount}
        onMaxPlayersChange={setMaxPlayers}
        onShowCreateForm={setShowCreateForm}
      />
    )
  }

  // Main render
  return (
    <div className={className}>
      {renderView()}
    </div>
  )
}

// Static metadata for contract dependencies
MatchBoard.metadata = MATCH_BOARD_METADATA
