import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { SCOREBOARD_ABI } from '../abis/scoreboard'
import { formatAddress, formatTokenAmount } from '../utils/format'
import { cn } from '../utils/cn'
import { TrendingUp, Coins } from 'lucide-react'
import { LEADERBOARD_METADATA } from '../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../context/OnchainContext'
import { ContractType } from '../types/contracts'

export interface LeaderBoardProps {
  /** Scoreboard contract address. If not provided, will be resolved from OharaAiProvider context */
  scoreBoardAddress?: `0x${string}`
  limit?: number
  sortBy?: 'wins' | 'prize'
  className?: string
}

export function LeaderBoard({
  scoreBoardAddress: scoreBoardAddressProp,
  limit = 10,
  sortBy: initialSortBy = 'wins',
  className,
}: LeaderBoardProps) {
  // Auto-register this component for dependency tracking
  useComponentRegistration('LeaderBoard')
  
  // Get contract address from context if not provided
  const { getContractAddress } = useOharaAi()
  const scoreBoardAddress = scoreBoardAddressProp || getContractAddress(ContractType.SCOREBOARD)

  // Local state for sorting type
  const [sortBy, setSortBy] = useState<'wins' | 'prize'>(initialSortBy)

  // Call all hooks unconditionally, use enabled to control execution
  const { data: leaderboardData, isLoading, error } = useReadContract({
    address: scoreBoardAddress,
    abi: SCOREBOARD_ABI,
    functionName: sortBy === 'wins' ? 'getTopPlayersByWins' : 'getTopPlayersByPrize',
    args: [BigInt(limit)],
    query: {
      enabled: !!scoreBoardAddress,
    },
  })

  // If no address provided or found, show error
  if (!scoreBoardAddress) {
    return (
      <div className={className}>
        <div className="text-red-500 text-sm">
          Scoreboard contract address not configured.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-red-500 text-sm">Error loading leaderboard</div>
      </div>
    )
  }

  const [players, wins, prizes] = leaderboardData || [[], [], []]

  return (
    <div className={className}>
      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSortBy('wins')}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            sortBy === 'wins'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <div className="flex items-center justify-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>By Wins</span>
          </div>
        </button>
        <button
          onClick={() => setSortBy('prize')}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            sortBy === 'prize'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Coins className="w-4 h-4" />
            <span>By Prize</span>
          </div>
        </button>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No players yet
        </div>
      ) : (
        <div className="space-y-1.5">
          {players.map((player: string, index: number) => {
            const rank = index + 1
            const isTopThree = rank <= 3
            
            return (
              <div
                key={player}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  isTopThree ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50'
                )}
              >
                {/* Rank */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                    rank === 1 && 'bg-yellow-400 text-yellow-900',
                    rank === 2 && 'bg-gray-300 text-gray-700',
                    rank === 3 && 'bg-orange-300 text-orange-900',
                    rank > 3 && 'bg-gray-200 text-gray-600'
                  )}
                >
                  {rank}
                </div>
                
                {/* Player Address */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gray-900">
                    {formatAddress(player)}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">
                      {wins[index]?.toString() || '0'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">
                      {formatTokenAmount(prizes[index] || BigInt(0))}
                    </span>
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
