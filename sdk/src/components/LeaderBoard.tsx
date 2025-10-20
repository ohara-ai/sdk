import { useState, useEffect } from 'react'
import { useReadContract, useWatchContractEvent } from 'wagmi'
import { SCOREBOARD_ABI } from '../abis/scoreboard'
import { GAME_MATCH_ABI } from '../abis/gameMatch'
import { formatAddress, formatTokenAmount } from '../utils/format'
import { cn } from '../utils/cn'
import { TrendingUp, Coins, Trophy, Loader2 } from 'lucide-react'
import { LEADERBOARD_METADATA } from '../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../context/OnchainContext'
import { ContractType } from '../types/contracts'

export interface LeaderBoardProps {
  /** Scoreboard contract address. If not provided, will be resolved from OharaAiProvider context */
  gameScoreAddress?: `0x${string}`
  limit?: number
  sortBy?: 'wins' | 'prize'
  /** Polling interval in milliseconds. Set to 0 to disable polling. Default: 5000 (5 seconds) */
  pollingInterval?: number
  /** Callback to expose refetch function to parent */
  onRefetchReady?: (refetch: () => void) => void
  className?: string
}

export function LeaderBoard({
  gameScoreAddress: gameScoreAddressProp,
  limit = 10,
  sortBy: initialSortBy = 'wins',
  pollingInterval = 5000,
  onRefetchReady,
  className,
}: LeaderBoardProps) {
  // Auto-register this component for dependency tracking
  useComponentRegistration('LeaderBoard')
  
  // Get contract addresses from context if not provided
  const { getContractAddress } = useOharaAi()
  const gameScoreAddress = gameScoreAddressProp || getContractAddress(ContractType.GAMESCORE)
  const gameMatchAddress = getContractAddress(ContractType.GAME_MATCH)

  // Local state for sorting type
  const [sortBy, setSortBy] = useState<'wins' | 'prize'>(initialSortBy)

  // Call all hooks unconditionally, use enabled to control execution
  const { data: leaderboardData, isLoading, error, refetch } = useReadContract({
    address: gameScoreAddress,
    abi: SCOREBOARD_ABI,
    functionName: sortBy === 'wins' ? 'getTopPlayersByWins' : 'getTopPlayersByPrize',
    args: [BigInt(limit)],
    query: {
      enabled: !!gameScoreAddress,
      refetchInterval: pollingInterval > 0 ? pollingInterval : false,
    },
  })

  // Expose refetch function to parent component
  useEffect(() => {
    if (onRefetchReady && refetch) {
      onRefetchReady(() => {
        console.log('🔄 LeaderBoard: Manual refresh triggered')
        refetch()
      })
    }
  }, [onRefetchReady, refetch])

  // Watch for MatchFinalized events to auto-refresh leaderboard
  useWatchContractEvent({
    address: gameMatchAddress,
    abi: GAME_MATCH_ABI,
    eventName: 'MatchFinalized',
    onLogs() {
      console.log('🏆 LeaderBoard: MatchFinalized event detected, refreshing...')
      // Delay to ensure scoreboard contract has been updated
      setTimeout(() => {
        refetch()
      }, 2000)
    },
    enabled: !!gameMatchAddress,
  })

  // If no address provided or found, show error
  if (!gameScoreAddress) {
    return (
      <div className={className}>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="font-semibold mb-1 text-red-700">Configuration Error</div>
          <div className="text-sm text-red-600">GameScore contract address not configured.</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="font-semibold mb-1 text-red-700">Error Loading Leaderboard</div>
          <div className="text-sm text-red-600">Failed to load leaderboard data</div>
        </div>
      </div>
    )
  }

  const [players, wins, prizes] = leaderboardData || [[], [], []]

  return (
    <div className={className}>
      {/* Header with toggle buttons */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSortBy('wins')}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg font-semibold transition-all shadow-sm',
              sortBy === 'wins'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>By Wins</span>
            </div>
          </button>
          <button
            onClick={() => setSortBy('prize')}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg font-semibold transition-all shadow-sm',
              sortBy === 'prize'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-4 h-4" />
              <span>By Prize</span>
            </div>
          </button>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <div className="text-gray-500 mb-2 font-medium">
            No players yet
          </div>
          <div className="text-xs text-gray-400">
            Play matches to appear on the leaderboard!
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {players.map((player: string, index: number) => {
            const rank = index + 1
            const isTopThree = rank <= 3
            
            return (
              <div
                key={player}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg transition-all border',
                  isTopThree 
                    ? 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-amber-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                )}
              >
                {/* Rank Badge */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2',
                    rank === 1 && 'bg-white border-amber-400 text-amber-600 shadow-md',
                    rank === 2 && 'bg-white border-gray-400 text-gray-700 shadow-md',
                    rank === 3 && 'bg-white border-orange-400 text-orange-600 shadow-md',
                    rank > 3 && 'bg-gray-50 border-gray-300 text-gray-600 shadow-sm'
                  )}
                >
                  {rank}
                </div>
                
                {/* Player Address */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-medium text-gray-900">
                    {formatAddress(player)}
                  </div>
                  {isTopThree && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Trophy className="w-3 h-3 text-amber-600" />
                      <span className="text-xs text-amber-700 font-semibold">
                        {rank === 1 ? 'Champion' : rank === 2 ? 'Runner-up' : 'Third Place'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700">
                        {wins[index]?.toString() || '0'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">wins</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Coins className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-bold text-blue-700">
                        {formatTokenAmount(prizes[index] || BigInt(0))}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">prize</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Static metadata for contract dependencies
LeaderBoard.metadata = LEADERBOARD_METADATA
