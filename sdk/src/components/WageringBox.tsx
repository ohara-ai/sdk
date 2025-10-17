import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient } from 'wagmi'
import { parseEther, zeroAddress, formatEther } from 'viem'
import { GAME_MATCH_ABI } from '../abis/gameMatch'
import { cn } from '../utils/cn'
import { Coins, Users, Plus, Loader2 } from 'lucide-react'
import { WAGERING_BOX_METADATA } from '../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../context/OnchainContext'
import { ContractType } from '../types/contracts'

export interface WageringBoxProps {
  /** GameMatch contract address. If not provided, will be resolved from OharaAiProvider context */
  gameMatchAddress?: `0x${string}`
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

export function WageringBox({
  gameMatchAddress: gameMatchAddressProp,
  onMatchCreated,
  onMatchJoined,
  className,
}: WageringBoxProps) {
  // Auto-register this component for dependency tracking
  useComponentRegistration('WageringBox')
  
  // Get contract address from context if not provided
  const { getContractAddress } = useOharaAi()
  const gameMatchAddress = gameMatchAddressProp || getContractAddress(ContractType.GAME_MATCH)
  
  const { address } = useAccount()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [matches, setMatches] = useState<MatchInfo[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [userJoinedMatchId, setUserJoinedMatchId] = useState<bigint | null>(null)

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
    console.log('🎮 WageringBox Debug:', {
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

  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } =
    useWaitForTransactionReceipt({ hash: createHash })

  const { isLoading: isJoinConfirming, isSuccess: isJoinSuccess } =
    useWaitForTransactionReceipt({ hash: joinHash })

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

  useEffect(() => {
    if (isCreateSuccess && createHash) {
      setStakeAmount('')
      setMaxPlayers('2')
      setShowCreateForm(false)
      refetchMatchIds()
      // TODO: Extract matchId from transaction logs
      onMatchCreated?.(BigInt(0))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateSuccess, createHash])

  useEffect(() => {
    if (isJoinSuccess && joinHash) {
      refetchMatchIds()
      onMatchJoined?.(BigInt(0)) // Will be updated when matches refetch
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoinSuccess, joinHash])

  // Check gameMatchAddress FIRST to ensure consistent SSR/client rendering
  if (!gameMatchAddress) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Coins className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Wagering</h2>
        </div>
        <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="font-semibold mb-1">Configuration Error</div>
          <div className="text-sm">GameMatch contract address not configured. Please set NEXT_PUBLIC_GAME_MATCH_INSTANCE or provide gameMatchAddress prop.</div>
        </div>
      </div>
    )
  }

  if (!address) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Coins className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Wagering</h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          Please connect your wallet to create or join matches
        </div>
      </div>
    )
  }

  // Group matches by ETH and ERC20
  const ethMatches = matches.filter((m) => m.token === zeroAddress)
  const erc20Matches = matches.filter((m) => m.token !== zeroAddress)

  // If user has joined a match, show different UI
  if (userJoinedMatchId !== null) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Coins className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Wagering</h2>
        </div>
        <div className="text-center py-8">
          <div className="mb-4 text-lg font-semibold text-gray-800">
            You're in Match #{userJoinedMatchId.toString()}
          </div>
          <div className="text-sm text-gray-600">
            Waiting for the game to start...
          </div>
        </div>
      </div>
    )
  }

  // Show match list or create form
  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Coins className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Wagering</h2>
      </div>

      {showCreateForm ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Create New Match</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stake Amount (ETH)
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Players
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      ) : (
        <>
          {/* Error Display */}
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
                {matchIds && (matchIds as readonly bigint[]).length > 0 ? (
                  <div className="text-xs text-gray-400">
                    Found {(matchIds as readonly bigint[]).length} total matches, but none are open.
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    Create the first match to get started!
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ETH Matches */}
                {ethMatches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      ETH Matches ({ethMatches.length})
                    </h3>
                    <div className="space-y-2">
                      {ethMatches.map((match) => (
                        <div
                          key={match.id.toString()}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-900">
                              Match #{match.id.toString()}
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatEther(match.stakeAmount)} ETH
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {match.players.length}/{match.maxPlayers.toString()} players
                            </div>
                          </div>
                          <button
                            onClick={() => handleJoinMatch(match.id, match.stakeAmount)}
                            disabled={isJoining || isJoinConfirming}
                            className={cn(
                              'w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors',
                              isJoining || isJoinConfirming
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            )}
                          >
                            {isJoining || isJoinConfirming ? 'Joining...' : 'Join Match'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ERC20 Matches */}
                {erc20Matches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      ERC20 Token Matches ({erc20Matches.length})
                    </h3>
                    <div className="space-y-2">
                      {erc20Matches.map((match) => (
                        <div
                          key={match.id.toString()}
                          className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
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
                          </div>
                          <div className="text-xs text-gray-500 mb-3 font-mono truncate">
                            Token: {match.token}
                          </div>
                          <button
                            onClick={() => handleJoinMatch(match.id, match.stakeAmount)}
                            disabled={isJoining || isJoinConfirming}
                            className={cn(
                              'w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors',
                              isJoining || isJoinConfirming
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            )}
                          >
                            {isJoining || isJoinConfirming ? 'Joining...' : 'Join Match'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create Match Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowCreateForm(true)}
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
      )}
    </div>
  )
}

// Static metadata for contract dependencies
WageringBox.metadata = WAGERING_BOX_METADATA
