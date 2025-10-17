import { useReadContract } from 'wagmi'
import { SCOREBOARD_ABI } from '../abis/scoreboard'
import { formatAddress, formatTokenAmount } from '../utils/format'
import { cn } from '../utils/cn'
import { Trophy, TrendingUp, Coins } from 'lucide-react'
import { LEADERBOARD_METADATA } from '../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../context/OnchainContext'
import { ContractType } from '../types/contracts'

export interface LeaderBoardProps {
  /** Scoreboard contract address. If not provided, will be resolved from OharaAiProvider context */
  scoreBoardAddress?: `0x${string}`
  limit?: number
  sortBy?: 'wins' | 'prize'
  className?: string
  showStats?: boolean
}

export function LeaderBoard({
  scoreBoardAddress: scoreBoardAddressProp,
  limit = 10,
  sortBy = 'wins',
  className,
  showStats = true,
}: LeaderBoardProps) {
  // Auto-register this component for dependency tracking
  useComponentRegistration('LeaderBoard')
  
  // Get contract address from context if not provided
  const { getContractAddress } = useOharaAi()
  const scoreBoardAddress = scoreBoardAddressProp || getContractAddress(ContractType.SCOREBOARD)

  // If no address provided or found, show error
  if (!scoreBoardAddress) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Leaderboard</h2>
        </div>
        <div className="text-red-500">
          Scoreboard contract address not configured. Please set NEXT_PUBLIC_SCOREBOARD_ADDRESS or provide scoreBoardAddress prop.
        </div>
      </div>
    )
  }
  
  const { data: leaderboardData, isLoading, error } = useReadContract({
    address: scoreBoardAddress,
    abi: SCOREBOARD_ABI,
    functionName: sortBy === 'wins' ? 'getTopPlayersByWins' : 'getTopPlayersByPrize',
    args: [BigInt(limit)],
  })

  const { data: totalPlayers } = useReadContract({
    address: scoreBoardAddress,
    abi: SCOREBOARD_ABI,
    functionName: 'getTotalPlayers',
  })

  const { data: totalMatches } = useReadContract({
    address: scoreBoardAddress,
    abi: SCOREBOARD_ABI,
    functionName: 'getTotalMatches',
  })

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Leaderboard</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading leaderboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Leaderboard</h2>
        </div>
        <div className="text-red-500">Error loading leaderboard</div>
      </div>
    )
  }

  const [players, wins, prizes] = leaderboardData || [[], [], []]

  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">Leaderboard</h2>
      </div>

      {showStats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Players</div>
            <div className="text-2xl font-bold text-blue-900">
              {totalPlayers?.toString() || '0'}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Total Matches</div>
            <div className="text-2xl font-bold text-purple-900">
              {totalMatches?.toString() || '0'}
            </div>
          </div>
        </div>
      )}

      {players.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No players yet. Be the first to compete!
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player: string, index: number) => {
            const rank = index + 1
            const isTopThree = rank <= 3
            
            return (
              <div
                key={player}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg transition-colors',
                  isTopThree ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gray-50 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                      rank === 1 && 'bg-yellow-400 text-yellow-900',
                      rank === 2 && 'bg-gray-300 text-gray-700',
                      rank === 3 && 'bg-orange-300 text-orange-900',
                      rank > 3 && 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {rank}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-medium">
                      {formatAddress(player)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-700">
                      {wins[index]?.toString() || '0'} wins
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-700">
                      {formatTokenAmount(prizes[index] || BigInt(0))} ETH
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
