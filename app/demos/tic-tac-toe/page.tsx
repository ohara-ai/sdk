'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { LeaderBoard } from '@/sdk/src/components/LeaderBoard'
import { MatchBoard } from '@/sdk/src/components/MatchBoard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Circle, ArrowLeft, ChevronDown, ChevronUp, Clock, Loader2, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'
import { ProviderStatus } from '@/components/ProviderStatus'
import { useOharaAi } from '@/sdk/src/context/OnchainContext'
import { ContractType } from '@/sdk/src/types/contracts'

type CellValue = 'X' | 'O' | null
type Board = CellValue[]

interface GameState {
  matchId: string
  contractAddress: string
  board: Board
  players: {
    X: string
    O: string
  }
  currentTurn: 'X' | 'O'
  status: 'waiting' | 'active' | 'finished'
  winner: 'X' | 'O' | 'draw' | null
  moveDeadline: number | null
  moveHistory: any[]
}

export default function TicTacToePage() {
  const { address } = useAccount()
  const { getContractAddress } = useOharaAi()
  const gameMatchAddress = getContractAddress(ContractType.GAME_MATCH)
  
  const [matchId, setMatchId] = useState<bigint | null>(null)
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false)
  const [isMatchCreated, setIsMatchCreated] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoadingGame, setIsLoadingGame] = useState(false)
  const [isInitializingGame, setIsInitializingGame] = useState(false)
  const [isMakingMove, setIsMakingMove] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [matchActivated, setMatchActivated] = useState(false)
  const [activationCountdown, setActivationCountdown] = useState<number | null>(null)
  const [isActivatingMatch, setIsActivatingMatch] = useState(false)
  const [countdownStartedForMatch, setCountdownStartedForMatch] = useState<string | null>(null)
  const [leaderboardRefetch, setLeaderboardRefetch] = useState<(() => void) | null>(null)

  // Track initialization to avoid duplicate calls without causing re-renders
  const isInitializingRef = useRef(false)
  const hasInitializedRef = useRef<string | null>(null) // Track which match we've initialized
  
  // Initialize game when match is activated
  const initializeGame = useCallback(async () => {
    if (matchId === null || !gameMatchAddress || isInitializingRef.current) return
    
    const matchIdStr = matchId.toString()
    
    // Check if we've already initialized this match
    if (hasInitializedRef.current === matchIdStr) {
      console.log('⚠️ Game already initialized for match:', matchIdStr)
      return
    }

    console.log('🎮 Starting game initialization for match:', matchIdStr)
    isInitializingRef.current = true
    setIsInitializingGame(true)
    try {
      const response = await fetch('/api/game/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: matchIdStr,
          contractAddress: gameMatchAddress,
        }),
      })

      const data = await response.json()
      if (data.success && data.game) {
        setGameState(data.game)
        setMatchActivated(true)
        hasInitializedRef.current = matchIdStr // Mark as initialized
        console.log('🎮 Game initialized:', data.game)
      }
    } catch (error) {
      console.error('Failed to initialize game:', error)
    } finally {
      isInitializingRef.current = false
      setIsInitializingGame(false)
    }
  }, [matchId, gameMatchAddress])

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    if (matchId === null) return

    try {
      const response = await fetch(`/api/game/state?matchId=${matchId.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.game) {
          // Verify this game state is for the current match
          if (data.game.matchId === matchId.toString()) {
            console.log('📊 Game state updated:', data.game.status)
            setGameState(data.game)
          } else {
            console.log('⚠️ Game state matchId mismatch, ignoring. Expected:', matchId.toString(), 'Got:', data.game.matchId)
          }
        }
      } else if (response.status === 404) {
        // Game not initialized yet OR was cleaned up after finalization
        console.log('⚠️ Game not found (404), match activated:', matchActivated)
        // Only try to initialize if match is activated AND we haven't already tried
        if (matchActivated && hasInitializedRef.current !== matchId?.toString()) {
          console.log('🔄 Triggering game initialization from fetchGameState')
          await initializeGame()
        }
      } else {
        console.error('❌ Unexpected response status:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error)
    }
  }, [matchId, matchActivated, initializeGame])

  // Make a move
  const handleCellClick = async (index: number) => {
    if (!gameState || !address || isMakingMove) return
    if (gameState.status !== 'active') {
      console.log('⚠️ Cannot make move: game status is', gameState.status)
      return
    }
    if (gameState.board[index] !== null) return

    // Ensure this is the correct match
    if (matchId === null || gameState.matchId !== matchId.toString()) {
      console.log('⚠️ Cannot make move: match ID mismatch. Current:', matchId?.toString(), 'Game:', gameState.matchId)
      setMoveError('Game state mismatch, please refresh')
      setTimeout(() => setMoveError(null), 3000)
      return
    }

    // Check if it's the player's turn
    const playerSymbol = gameState.players.X.toLowerCase() === address.toLowerCase() ? 'X' : 
                        gameState.players.O.toLowerCase() === address.toLowerCase() ? 'O' : null
    
    if (!playerSymbol) {
      setMoveError('You are not a player in this game')
      return
    }

    if (playerSymbol !== gameState.currentTurn) {
      setMoveError('Not your turn')
      setTimeout(() => setMoveError(null), 3000)
      return
    }

    setIsMakingMove(true)
    setMoveError(null)

    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: matchId!.toString(),
          playerAddress: address,
          position: index,
        }),
      })

      const data = await response.json()
      if (data.success && data.game) {
        setGameState(data.game)
      } else {
        setMoveError(data.error || 'Failed to make move')
        setTimeout(() => setMoveError(null), 3000)
      }
    } catch (error) {
      console.error('Failed to make move:', error)
      setMoveError('Failed to make move')
      setTimeout(() => setMoveError(null), 3000)
    } finally {
      setIsMakingMove(false)
    }
  }

  // Poll activation countdown status
  useEffect(() => {
    if (matchId === null || matchActivated) return

    const pollCountdown = async () => {
      try {
        const response = await fetch(`/api/match-countdown/status?matchId=${matchId.toString()}`)
        const data = await response.json()

        if (data.success) {
          if (data.hasCountdown && !data.activated) {
            setActivationCountdown(data.remainingSeconds)
            setIsActivatingMatch(data.isActivating)
            
            if (data.remainingSeconds === 0) {
              setIsActivatingMatch(true)
            }
          } else if (data.activated) {
            // Match activated
            console.log('🎮 Match activated detected by countdown polling')
            setActivationCountdown(null)
            setIsActivatingMatch(false)
            setMatchActivated(true)
            setCountdownStartedForMatch(null)
          } else {
            // No countdown
            setActivationCountdown(null)
            setIsActivatingMatch(false)
          }
        }
      } catch (error) {
        console.error('❌ Error polling countdown:', error)
      }
    }

    // Poll immediately
    pollCountdown()

    // Then poll every second
    const interval = setInterval(pollCountdown, 1000)
    return () => clearInterval(interval)
  }, [matchId, matchActivated])

  // Cancel countdown on withdrawal
  const cancelCountdown = useCallback(async () => {
    if (matchId === null) return

    try {
      await fetch('/api/match-countdown/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchId.toString() }),
      })
      setActivationCountdown(null)
      setIsActivatingMatch(false)
    } catch (error) {
      console.error('Error cancelling countdown:', error)
    }
  }, [matchId])

  // Check for timeouts
  const checkTimeout = useCallback(async () => {
    if (matchId === null || !gameState || gameState.status !== 'active') return

    try {
      const response = await fetch('/api/game/check-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchId.toString() }),
      })

      const data = await response.json()
      if (data.success && data.game) {
        setGameState(data.game)
        if (data.timedOut) {
          console.log('⏰ Player timed out, match finalized')
        }
      }
    } catch (error) {
      console.error('Failed to check timeout:', error)
    }
  }, [matchId, gameState])

  const handleMatchCreated = (id: bigint) => {
    console.log('Match created with ID:', id.toString())
    setMatchId(id)
    setIsMatchCreated(true)
    setGameState(null)
    setMatchActivated(false)
    setActivationCountdown(null)
    setIsActivatingMatch(false)
    setCountdownStartedForMatch(null)
    hasInitializedRef.current = null // Reset initialization tracking
  }

  const handleMatchJoined = (id: bigint) => {
    console.log('Joined match with ID:', id.toString())
    setMatchId(id)
    setIsMatchCreated(false)
    setGameState(null)
    setMatchActivated(false)
    setActivationCountdown(null)
    setIsActivatingMatch(false)
    setCountdownStartedForMatch(null)
    hasInitializedRef.current = null // Reset initialization tracking
  }

  const handleMatchLeft = useCallback(() => {
    console.log('Left match, cancelling countdown')
    cancelCountdown()
    setMatchId(null)
    setIsMatchCreated(false)
    setGameState(null)
    setMatchActivated(false)
    setActivationCountdown(null)
    setIsActivatingMatch(false)
    setCountdownStartedForMatch(null)
  }, [cancelCountdown])

  const handlePlayerWithdrew = useCallback((withdrawnMatchId: bigint, player: string) => {
    console.log('Player withdrew from match:', withdrawnMatchId.toString(), player)
    
    // If this is the match we're in and countdown is active, cancel it
    // The server will also auto-cancel when it detects the match isn't full
    if (matchId !== null && withdrawnMatchId === matchId && activationCountdown !== null) {
      console.log('⚠️ Player withdrew during countdown - cancelling')
      cancelCountdown()
    }
  }, [matchId, activationCountdown, cancelCountdown])

  const handleMatchActivated = (id?: bigint) => {
    const activatedMatchId = id ?? matchId
    console.log('Match activated, initializing game...', activatedMatchId?.toString())
    
    // Check if this match is already activated - don't reset state if so
    // This prevents infinite reinitialization when MatchBoard keeps polling
    if (matchActivated && matchId === activatedMatchId && hasInitializedRef.current === activatedMatchId?.toString()) {
      console.log('⏭️ Match already activated and initialized, ignoring duplicate activation event')
      return
    }
    
    // Set matchId if provided (important for page refresh case)
    // Use !== undefined because bigint 0n is falsy but valid
    if (id !== undefined && matchId !== id) {
      setMatchId(id)
    }
    
    // Clear any stale game state from previous match
    // Game will be reinitialized after activation
    setGameState(null)
    setMatchActivated(true)
    setActivationCountdown(null)
    setIsActivatingMatch(false)
    setCountdownStartedForMatch(null)
    hasInitializedRef.current = null // Reset to allow initialization for this activated match
  }

  const handleMatchFinalized = (id: bigint, winner: `0x${string}`) => {
    console.log('🏆 Match finalized! Winner:', winner, 'Match ID:', id.toString())
    // The MatchBoard will handle showing the finalized state
    // Refresh the LeaderBoard to show updated stats
    if (leaderboardRefetch) {
      console.log('🏆 Refreshing LeaderBoard after match finalization')
      setTimeout(() => {
        leaderboardRefetch()
      }, 1000) // Small delay to ensure on-chain data has updated
    }
  }

  const handleMatchDismissed = useCallback(() => {
    console.log('🔄 Match finalized summary dismissed, resetting game state')
    // Reset all game-related state to allow starting a new game
    setMatchId(null)
    setIsMatchCreated(false)
    setGameState(null)
    setMatchActivated(false)
    setActivationCountdown(null)
    setIsActivatingMatch(false)
    setCountdownStartedForMatch(null)
    hasInitializedRef.current = null // Reset initialization tracking
  }, [])

  const handleMatchFull = useCallback(async (id: bigint) => {
    const matchIdStr = id.toString()
    
    // Only process if this is the current match
    // Don't process if we have state from a different match
    if (matchId !== null && matchId !== id) {
      console.log('⏭️ Match full event for different match, ignoring. Current:', matchId.toString(), 'Event:', matchIdStr)
      return
    }
    
    // Don't start countdown if THIS match is already activated or has a game state
    if (matchId === id && (matchActivated || gameState)) {
      console.log('⏭️ This match already activated/has game state, ignoring match full event:', matchIdStr)
      return
    }
    
    // Only start countdown once per match
    if (countdownStartedForMatch === matchIdStr) {
      console.log('⏭️ Countdown already started for match:', matchIdStr)
      return
    }

    console.log('Match is full! Starting countdown...', matchIdStr)
    if (!gameMatchAddress) return

    // Mark that we're starting the countdown for this match
    setCountdownStartedForMatch(matchIdStr)

    try {
      const response = await fetch('/api/match-countdown/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: matchIdStr,
          contractAddress: gameMatchAddress,
          countdownSeconds: 30,
        }),
      })

      const data = await response.json()
      if (data.success) {
        console.log('✅ Countdown started:', data)
        // Only set the initial value, let polling handle updates
        if (activationCountdown === null) {
          setActivationCountdown(data.remainingSeconds)
        }
      } else {
        console.error('❌ Failed to start countdown:', data.error)
        // Reset the flag on error so it can be retried
        setCountdownStartedForMatch(null)
      }
    } catch (error) {
      console.error('❌ Error starting countdown:', error)
      // Reset the flag on error so it can be retried
      setCountdownStartedForMatch(null)
    }
  }, [gameMatchAddress, countdownStartedForMatch, activationCountdown, matchActivated, gameState, matchId])

  // Check for existing game when matchId changes (handles page refresh)
  useEffect(() => {
    if (matchId === null) return
    
    const checkExistingGame = async () => {
      try {
        console.log('🔍 Checking for existing game on mount/matchId change:', matchId.toString())
        const response = await fetch(`/api/game/state?matchId=${matchId.toString()}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.game) {
            console.log('✅ Found existing game, loading state')
            setGameState(data.game)
            setMatchActivated(true)
          }
        }
      } catch (error) {
        console.error('Error checking for existing game:', error)
      }
    }
    
    checkExistingGame()
  }, [matchId])

  // Poll for game state updates when match is activated
  useEffect(() => {
    if (matchId === null || !matchActivated) return
    
    console.log('🔄 Starting game state polling for match:', matchId.toString(), 'callback ID:', fetchGameState)
    // Initial fetch
    fetchGameState()
    // Poll every 5 seconds
    const interval = setInterval(fetchGameState, 5000)
    return () => {
      console.log('🛑 Stopping game state polling for match:', matchId.toString())
      clearInterval(interval)
    }
  }, [matchId, matchActivated, fetchGameState])

  // Initialize game when match is activated
  useEffect(() => {
    if (matchActivated && !gameState && matchId !== null && !isInitializingGame) {
      console.log('🎮 Match activated, initializing game...')
      // Small delay to ensure activation has propagated
      const timer = setTimeout(() => {
        initializeGame()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [matchActivated, gameState, matchId, isInitializingGame, initializeGame])

  // Update time remaining
  useEffect(() => {
    if (!gameState || gameState.status !== 'active' || !gameState.moveDeadline) {
      setTimeRemaining(null)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((gameState.moveDeadline! - Date.now()) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        // Check for timeout
        checkTimeout()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100)
    return () => clearInterval(interval)
  }, [gameState, checkTimeout])

  // Get player info
  const getPlayerInfo = () => {
    if (!gameState || !address) return null

    const addr = address.toLowerCase()
    if (gameState.players.X === addr) {
      return { symbol: 'X' as const, isMyTurn: gameState.currentTurn === 'X' }
    }
    if (gameState.players.O === addr) {
      return { symbol: 'O' as const, isMyTurn: gameState.currentTurn === 'O' }
    }
    return null
  }

  const playerInfo = getPlayerInfo()
  const isSpectator = gameState && address && !playerInfo

  // Debug logging for render state
  useEffect(() => {
    console.log('🎨 Render state:', {
      matchId: matchId?.toString() || 'null',
      matchActivated,
      hasGameState: !!gameState,
      gameStatus: gameState?.status || 'none',
      activationCountdown,
      isActivatingMatch,
      isInitializingGame,
    })
  }, [matchId, matchActivated, gameState, activationCountdown, isActivatingMatch, isInitializingGame])

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Wagered Tic-Tac-Toe</h1>
              <p className="text-gray-600">
                Play tic-tac-toe with real stakes. Create or join a match to start playing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ConnectWallet />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeveloperInfo(!showDeveloperInfo)}
                className="flex items-center gap-1.5"
              >
                Developer Info
                {showDeveloperInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {showDeveloperInfo && (
          <div className="space-y-4 mb-6 animate-in slide-in-from-top duration-200">
            <ContractDependencyInfo />
            <ProviderStatus />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Game Board</span>
                  {matchId !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal text-gray-500">
                        Match #{matchId.toString()}
                      </span>
                      {isMatchCreated && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          Created
                        </span>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md mx-auto">
                  {/* Activation Countdown Banner */}
                  {activationCountdown !== null && !matchActivated && (
                    <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-5 shadow-lg border-2 border-green-400">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-base font-bold text-white">Match Starting Soon</div>
                            <div className="text-sm text-white/95 font-medium">
                              Game begins in {activationCountdown} {activationCountdown === 1 ? 'second' : 'seconds'}
                            </div>
                          </div>
                        </div>
                        <div className="text-4xl font-bold tabular-nums text-white drop-shadow-lg">
                          {activationCountdown}
                        </div>
                      </div>
                      {isActivatingMatch && (
                        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/20">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span className="text-sm text-white font-medium">Activating match...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Waiting for match */}
                  {!gameState && !matchActivated && activationCountdown === null && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-semibold mb-2">No Active Game</p>
                      <p className="text-sm">Create or join a match to start playing</p>
                    </div>
                  )}

                  {/* Initializing game or waiting for game state */}
                  {matchActivated && !gameState && (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                      <p className="text-lg font-semibold mb-2">Initializing game...</p>
                      <p className="text-sm text-gray-500">Setting up the game board</p>
                      <button
                        onClick={() => initializeGame()}
                        className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Retry Initialization
                      </button>
                    </div>
                  )}

                  {/* Active game */}
                  {gameState && (
                    <>
                      {/* Error Message */}
                      {moveError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                          {moveError}
                        </div>
                      )}

                      {/* Game Status */}
                      {gameState.status === 'finished' ? (
                        <div className="mb-6 text-center">
                          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full mb-4">
                            <Trophy className="w-6 h-6" />
                            <span className="text-2xl font-bold">
                              {gameState.winner === 'draw' 
                                ? "It's a Draw!" 
                                : `Player ${gameState.winner} Wins!`}
                            </span>
                          </div>
                          {gameState.winner !== 'draw' && playerInfo && (
                            <div className="text-lg">
                              {playerInfo.symbol === gameState.winner ? (
                                <span className="text-green-600 font-semibold">🎉 You Won!</span>
                              ) : (
                                <span className="text-red-600 font-semibold">You Lost</span>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-2">Match finalized on-chain</p>
                        </div>
                      ) : (
                        <div className="mb-6">
                          {/* Current Turn & Timer */}
                          <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Current Turn</div>
                              <div className="flex items-center gap-2">
                                {gameState.currentTurn === 'X' ? (
                                  <X className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <Circle className="w-6 h-6 text-red-600" />
                                )}
                                <span className="text-xl font-bold">Player {gameState.currentTurn}</span>
                                {playerInfo && playerInfo.isMyTurn && (
                                  <Badge className="bg-green-500">Your Turn</Badge>
                                )}
                              </div>
                            </div>
                            
                            {timeRemaining !== null && (
                              <div className="text-center">
                                <div className="text-sm text-gray-600 mb-1">Time Left</div>
                                <div className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${
                                  timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-800'
                                }`}>
                                  <Clock className="w-5 h-5" />
                                  {timeRemaining}s
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Player Info */}
                          {playerInfo && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                              <span className="text-sm text-blue-800">
                                You are playing as <span className="font-bold">Player {playerInfo.symbol}</span>
                              </span>
                            </div>
                          )}

                          {isSpectator && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                              <span className="text-sm text-gray-600">
                                👁️ You are spectating this game
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Game Board */}
                      <div className="grid grid-cols-3 gap-3 aspect-square relative">
                        {isMakingMove && (
                          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                          </div>
                        )}
                        {gameState.board.map((cell: CellValue, index: number) => {
                          const isMyTurn = playerInfo?.isMyTurn
                          const canClick = gameState.status === 'active' && !cell && isMyTurn && !isMakingMove
                          
                          return (
                            <button
                              key={index}
                              onClick={() => handleCellClick(index)}
                              disabled={!canClick}
                              className={`bg-white border-2 rounded-lg transition-all flex items-center justify-center text-4xl font-bold ${
                                canClick
                                  ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                                  : 'border-gray-200 cursor-not-allowed'
                              } ${cell ? 'bg-gray-50' : ''}`}
                            >
                              {cell === 'X' && <X className="w-16 h-16 text-blue-600" />}
                              {cell === 'O' && <Circle className="w-16 h-16 text-red-600" />}
                            </button>
                          )
                        })}
                      </div>

                      {/* Game Info */}
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Players
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4 text-blue-600" />
                              <span className="font-mono text-xs">
                                {gameState.players.X.slice(0, 6)}...{gameState.players.X.slice(-4)}
                              </span>
                            </div>
                            {playerInfo?.symbol === 'X' && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center gap-2">
                              <Circle className="w-4 h-4 text-red-600" />
                              <span className="font-mono text-xs">
                                {gameState.players.O.slice(0, 6)}...{gameState.players.O.slice(-4)}
                              </span>
                            </div>
                            {playerInfo?.symbol === 'O' && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* How to Play */}
            <Card>
              <CardHeader>
                <CardTitle>How to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-gray-700 space-y-2">
                  <li>1. Create or join a wagered match using the MatchBoard</li>
                  <li>2. Wait for another player to join (30s countdown starts)</li>
                  <li>3. Game activates automatically when full</li>
                  <li>4. Players take turns placing X and O (60s per move)</li>
                  <li>5. First to get 3 in a row wins the prize pool!</li>
                  <li>6. If you timeout, you lose automatically</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Match Board - Address automatically resolved from OharaAiProvider */}
          <div className="space-y-6">
            <MatchBoard
              presetMaxPlayers={2}
              onMatchCreated={handleMatchCreated}
              onMatchJoined={handleMatchJoined}
              onMatchActivated={handleMatchActivated}
              onMatchFull={handleMatchFull}
              onMatchLeft={handleMatchLeft}
              onPlayerWithdrew={handlePlayerWithdrew}
              onMatchFinalized={handleMatchFinalized}
              onMatchDismissed={handleMatchDismissed}
              countdownSeconds={activationCountdown}
              isActivating={isActivatingMatch}
            />

            {/* Leaderboard - Address automatically resolved from OharaAiProvider */}
            <LeaderBoard
              limit={10}
              sortBy="wins"
              pollingInterval={10000}
              onRefetchReady={useCallback((refetch: () => void) => setLeaderboardRefetch(() => refetch), [])}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
