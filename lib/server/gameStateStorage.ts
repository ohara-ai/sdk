/**
 * Game State Storage Service
 * Manages TicTacToe game states in memory
 * In production, this should be replaced with a database (Redis, PostgreSQL, etc.)
 */

export type CellValue = 'X' | 'O' | null
export type Board = CellValue[]

export interface GameState {
  matchId: string
  contractAddress: string
  board: Board
  players: {
    X: string // address
    O: string // address
  }
  currentTurn: 'X' | 'O'
  status: 'waiting' | 'active' | 'finished'
  winner: 'X' | 'O' | 'draw' | null
  moveDeadline: number | null // timestamp in ms
  moveHistory: {
    player: string
    position: number
    timestamp: number
  }[]
  createdAt: number
  lastMoveAt: number
}

// In-memory storage (replace with database in production)
const gameStates = new Map<string, GameState>()

// Timeout handlers for move deadlines
const timeoutHandlers = new Map<string, NodeJS.Timeout>()

export class GameStateStorage {
  /**
   * Initialize a new game when match is activated
   */
  static initGame(
    matchId: string,
    contractAddress: string,
    players: string[]
  ): GameState {
    if (players.length !== 2) {
      throw new Error('TicTacToe requires exactly 2 players')
    }

    const gameState: GameState = {
      matchId,
      contractAddress,
      board: Array(9).fill(null),
      players: {
        X: players[0].toLowerCase(),
        O: players[1].toLowerCase(),
      },
      currentTurn: 'X',
      status: 'active',
      winner: null,
      moveDeadline: Date.now() + 60000, // 60 seconds for first move
      moveHistory: [],
      createdAt: Date.now(),
      lastMoveAt: Date.now(),
    }

    gameStates.set(matchId, gameState)
    console.log('🎮 Game initialized:', matchId, gameState.players)
    
    return gameState
  }

  /**
   * Get game state by match ID
   */
  static getGame(matchId: string): GameState | null {
    return gameStates.get(matchId) || null
  }

  /**
   * Make a move in the game
   */
  static makeMove(
    matchId: string,
    playerAddress: string,
    position: number
  ): {
    success: boolean
    gameState: GameState
    error?: string
  } {
    const game = gameStates.get(matchId)
    
    if (!game) {
      return { success: false, gameState: null as any, error: 'Game not found' }
    }

    if (game.status !== 'active') {
      return { success: false, gameState: game, error: 'Game is not active' }
    }

    // Check if move deadline has passed
    if (game.moveDeadline && Date.now() > game.moveDeadline) {
      return { success: false, gameState: game, error: 'Move deadline exceeded' }
    }

    // Validate it's the player's turn
    const playerSymbol = this.getPlayerSymbol(game, playerAddress)
    if (!playerSymbol) {
      return { success: false, gameState: game, error: 'Not a player in this game' }
    }

    if (playerSymbol !== game.currentTurn) {
      return { success: false, gameState: game, error: 'Not your turn' }
    }

    // Validate position
    if (position < 0 || position > 8) {
      return { success: false, gameState: game, error: 'Invalid position' }
    }

    if (game.board[position] !== null) {
      return { success: false, gameState: game, error: 'Position already taken' }
    }

    // Make the move
    game.board[position] = playerSymbol
    game.moveHistory.push({
      player: playerAddress.toLowerCase(),
      position,
      timestamp: Date.now(),
    })
    game.lastMoveAt = Date.now()

    // Check for winner
    const winner = this.checkWinner(game.board)
    if (winner) {
      game.winner = winner
      game.status = 'finished'
      game.moveDeadline = null
      console.log('🏆 Game finished:', matchId, 'Winner:', winner)
    } else {
      // Switch turn and set new deadline
      game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X'
      game.moveDeadline = Date.now() + 60000 // 60 seconds for next move
    }

    gameStates.set(matchId, game)
    return { success: true, gameState: game }
  }

  /**
   * Handle move timeout - player loses
   */
  static handleTimeout(matchId: string): GameState | null {
    const game = gameStates.get(matchId)
    
    if (!game || game.status !== 'active') {
      return null
    }

    // Current player timed out, they lose
    const losingPlayer = game.currentTurn
    const winningPlayer = losingPlayer === 'X' ? 'O' : 'X'
    
    game.winner = winningPlayer
    game.status = 'finished'
    game.moveDeadline = null
    
    console.log('⏰ Player timed out:', matchId, 'Losing player:', losingPlayer)
    gameStates.set(matchId, game)
    
    return game
  }

  /**
   * Delete a game (cleanup)
   */
  static deleteGame(matchId: string): void {
    gameStates.delete(matchId)
    
    // Clear any timeout handlers
    const handler = timeoutHandlers.get(matchId)
    if (handler) {
      clearTimeout(handler)
      timeoutHandlers.delete(matchId)
    }
  }

  /**
   * Get player symbol (X or O)
   */
  private static getPlayerSymbol(
    game: GameState,
    playerAddress: string
  ): 'X' | 'O' | null {
    const addr = playerAddress.toLowerCase()
    if (game.players.X === addr) return 'X'
    if (game.players.O === addr) return 'O'
    return null
  }

  /**
   * Check for winner
   */
  private static checkWinner(board: Board): 'X' | 'O' | 'draw' | null {
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

    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]!
      }
    }

    // Check for draw
    if (board.every((cell) => cell !== null)) {
      return 'draw'
    }

    return null
  }

  /**
   * Set timeout handler for a game
   */
  static setTimeoutHandler(matchId: string, handler: NodeJS.Timeout): void {
    timeoutHandlers.set(matchId, handler)
  }

  /**
   * Get all active games (for monitoring/debugging)
   */
  static getAllGames(): GameState[] {
    return Array.from(gameStates.values())
  }
}
