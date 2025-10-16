import React, { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther, zeroAddress } from 'viem'
import { GAME_MATCH_ABI } from '../abis/gameMatch'
import { cn } from '../utils/cn'
import { Coins, Users, Plus, ArrowRight } from 'lucide-react'

export interface WageringBoxProps {
  gameMatchAddress: `0x${string}`
  onMatchCreated?: (matchId: bigint) => void
  onMatchJoined?: (matchId: bigint) => void
  className?: string
}

export function WageringBox({
  gameMatchAddress,
  onMatchCreated,
  onMatchJoined,
  className,
}: WageringBoxProps) {
  const { address } = useAccount()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [matchIdToJoin, setMatchIdToJoin] = useState('')

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

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stakeAmount || !maxPlayers) return

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

  const handleJoinMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matchIdToJoin) return

    try {
      joinMatch({
        address: gameMatchAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'joinMatch',
        args: [BigInt(matchIdToJoin)],
        value: parseEther(stakeAmount),
      })
    } catch (error) {
      console.error('Error joining match:', error)
    }
  }

  React.useEffect(() => {
    if (isCreateSuccess && createHash) {
      setStakeAmount('')
      setMaxPlayers('2')
      // TODO: Extract matchId from transaction logs
      onMatchCreated?.(BigInt(0))
    }
  }, [isCreateSuccess, createHash, onMatchCreated])

  React.useEffect(() => {
    if (isJoinSuccess && joinHash) {
      setMatchIdToJoin('')
      setStakeAmount('')
      onMatchJoined?.(BigInt(matchIdToJoin))
    }
  }, [isJoinSuccess, joinHash, matchIdToJoin, onMatchJoined])

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

  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-6', className)}>
      <div className="flex items-center gap-2 mb-6">
        <Coins className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Wagering</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('create')}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
            mode === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Match
        </button>
        <button
          onClick={() => setMode('join')}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
            mode === 'join'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <ArrowRight className="w-4 h-4 inline mr-2" />
          Join Match
        </button>
      </div>

      {mode === 'create' ? (
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
      ) : (
        <form onSubmit={handleJoinMatch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Match ID
            </label>
            <input
              type="number"
              min="0"
              value={matchIdToJoin}
              onChange={(e) => setMatchIdToJoin(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter match ID"
              required
            />
          </div>

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

          <button
            type="submit"
            disabled={isJoining || isJoinConfirming}
            className={cn(
              'w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors',
              isJoining || isJoinConfirming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isJoining || isJoinConfirming ? 'Joining Match...' : 'Join Match'}
          </button>

          {isJoinSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Successfully joined the match!
            </div>
          )}
        </form>
      )}
    </div>
  )
}
