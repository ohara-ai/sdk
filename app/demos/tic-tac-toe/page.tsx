'use client'

import { useState } from 'react'
import { LeaderBoard } from '@/sdk/src/components/LeaderBoard'
import { MatchBoard } from '@/sdk/src/components/MatchBoard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Circle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'
import { ProviderStatus } from '@/components/ProviderStatus'

type CellValue = 'X' | 'O' | null
type Board = CellValue[]

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export default function TicTacToePage() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X')
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null)
  const [matchId, setMatchId] = useState<bigint | null>(null)
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false)
  const [isMatchCreated, setIsMatchCreated] = useState(false)

  const checkWinner = (newBoard: Board): 'X' | 'O' | 'draw' | null => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        return newBoard[a]!
      }
    }
    if (newBoard.every((cell) => cell !== null)) {
      return 'draw'
    }
    return null
  }

  const handleCellClick = (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = currentPlayer
    setBoard(newBoard)

    const gameWinner = checkWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
    setWinner(null)
  }

  const handleMatchCreated = (id: bigint) => {
    console.log('Match created with ID:', id.toString())
    setMatchId(id)
    setIsMatchCreated(true)
    resetGame()
  }

  const handleMatchJoined = (id: bigint) => {
    console.log('Joined match with ID:', id.toString())
    setMatchId(id)
    setIsMatchCreated(false)
    resetGame()
  }

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
                  {winner ? (
                    <div className="mb-6 text-center">
                      <div className="text-2xl font-bold mb-2">
                        {winner === 'draw' ? "It's a Draw!" : `Player ${winner} Wins!`}
                      </div>
                      <Button onClick={resetGame} className="mt-4">
                        Play Again
                      </Button>
                    </div>
                  ) : (
                    <div className="mb-6 text-center">
                      <div className="text-xl font-semibold">
                        Current Player: {currentPlayer}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 aspect-square">
                    {board.map((cell, index) => (
                      <button
                        key={index}
                        onClick={() => handleCellClick(index)}
                        disabled={!!cell || !!winner}
                        className="bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 
                                 transition-all disabled:cursor-not-allowed disabled:hover:border-gray-300
                                 flex items-center justify-center text-4xl font-bold"
                      >
                        {cell === 'X' && <X className="w-16 h-16 text-blue-600" />}
                        {cell === 'O' && <Circle className="w-16 h-16 text-red-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">How to Play:</h3>
                    <ol className="text-sm text-gray-700 space-y-1">
                      <li>1. Create or join a wagered match using the MatchBoard</li>
                      <li>2. Players take turns placing X and O</li>
                      <li>3. First to get 3 in a row wins the match</li>
                      <li>4. Winner takes the prize pool!</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Match Board - Address automatically resolved from OharaAiProvider */}
          <div className="space-y-6">
            <MatchBoard
              presetMaxPlayers={2}
              onMatchCreated={handleMatchCreated}
              onMatchJoined={handleMatchJoined}
            />
          </div>
        </div>

        {/* Leaderboard - Address automatically resolved from OharaAiProvider */}
        <div className="mt-6">
          <LeaderBoard
            limit={10}
            sortBy="wins"
          />
        </div>
      </div>
    </div>
  )
}
