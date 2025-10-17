import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient, useWatchContractEvent } from 'wagmi'
import { parseEther, zeroAddress, formatEther, decodeEventLog } from 'viem'
import { GAME_MATCH_ABI, MatchStatus } from '../../abis/gameMatch'
import { MATCH_BOARD_METADATA } from '../../metadata/componentDependencies'
import { useComponentRegistration, useOharaAi } from '../../context/OnchainContext'
import { ContractType } from '../../types/contracts'
import { MatchBoardProps, MatchInfo } from './types'
import { NoActiveMatchView } from './NoActiveMatchView'
import { WaitingForPlayersView } from './WaitingForPlayersView'
import { MatchActiveView } from './MatchActiveView'

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
          setUserJoinedMatchId(matchId)
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

// Re-export types for convenience
export type { MatchBoardProps, MatchInfo }
