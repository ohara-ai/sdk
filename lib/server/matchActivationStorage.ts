/**
 * Match Activation Storage Service
 * Manages match activation countdown states
 * Tracks when matches become full and when they should be auto-activated
 */

export interface MatchActivationState {
  matchId: string
  contractAddress: string
  fullAt: number // timestamp when match became full
  activationDeadline: number // timestamp when match should be activated
  isActivating: boolean // flag to prevent duplicate activation attempts
  activated: boolean // whether match has been activated
}

// In-memory storage (replace with database in production)
const activationStates = new Map<string, MatchActivationState>()

// Timeout handlers for automatic activation
const activationTimeouts = new Map<string, NodeJS.Timeout>()

export class MatchActivationStorage {
  /**
   * Start countdown for a match that just became full
   * @param matchId - The match ID
   * @param contractAddress - The contract address
   * @param countdownSeconds - How many seconds until activation (default 30)
   */
  static startCountdown(
    matchId: string,
    contractAddress: string,
    countdownSeconds: number = 30
  ): MatchActivationState {
    const now = Date.now()
    const activationDeadline = now + (countdownSeconds * 1000)
    
    const state: MatchActivationState = {
      matchId,
      contractAddress,
      fullAt: now,
      activationDeadline,
      isActivating: false,
      activated: false,
    }
    
    activationStates.set(matchId, state)
    console.log('⏱️ Countdown started for match:', matchId, `(${countdownSeconds}s)`)
    
    return state
  }

  /**
   * Get activation state for a match
   */
  static getState(matchId: string): MatchActivationState | null {
    return activationStates.get(matchId) || null
  }

  /**
   * Get remaining seconds until activation
   * Returns null if no countdown active or already expired
   */
  static getRemainingSeconds(matchId: string): number | null {
    const state = activationStates.get(matchId)
    if (!state || state.activated) return null
    
    const remaining = Math.max(0, Math.floor((state.activationDeadline - Date.now()) / 1000))
    return remaining
  }

  /**
   * Mark a match as activating to prevent duplicate activation attempts
   */
  static markActivating(matchId: string): boolean {
    const state = activationStates.get(matchId)
    if (!state || state.isActivating || state.activated) {
      return false
    }
    
    state.isActivating = true
    activationStates.set(matchId, state)
    return true
  }

  /**
   * Mark a match as activated
   */
  static markActivated(matchId: string): void {
    const state = activationStates.get(matchId)
    if (!state) return
    
    state.activated = true
    state.isActivating = false
    activationStates.set(matchId, state)
    
    // Clear timeout if exists
    const timeout = activationTimeouts.get(matchId)
    if (timeout) {
      clearTimeout(timeout)
      activationTimeouts.delete(matchId)
    }
    
    console.log('✅ Match activation complete:', matchId)
  }

  /**
   * Cancel countdown (e.g., if a player withdraws)
   */
  static cancelCountdown(matchId: string): void {
    activationStates.delete(matchId)
    
    const timeout = activationTimeouts.get(matchId)
    if (timeout) {
      clearTimeout(timeout)
      activationTimeouts.delete(matchId)
    }
    
    console.log('❌ Countdown cancelled for match:', matchId)
  }

  /**
   * Check if countdown has expired and match should be activated
   */
  static shouldActivate(matchId: string): boolean {
    const state = activationStates.get(matchId)
    if (!state || state.activated || state.isActivating) {
      return false
    }
    
    return Date.now() >= state.activationDeadline
  }

  /**
   * Get all matches that need activation
   */
  static getMatchesToActivate(): MatchActivationState[] {
    const now = Date.now()
    return Array.from(activationStates.values())
      .filter(state => 
        !state.activated && 
        !state.isActivating && 
        now >= state.activationDeadline
      )
  }

  /**
   * Set a timeout handler for automatic activation
   */
  static setActivationTimeout(matchId: string, timeout: NodeJS.Timeout): void {
    activationTimeouts.set(matchId, timeout)
  }

  /**
   * Get all active countdowns (for monitoring/debugging)
   */
  static getAllStates(): MatchActivationState[] {
    return Array.from(activationStates.values())
  }

  /**
   * Clean up completed activations
   */
  static cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []
    
    activationStates.forEach((state, matchId) => {
      // Remove states that are activated and older than 5 minutes
      if (state.activated && (now - state.activationDeadline) > 5 * 60 * 1000) {
        toDelete.push(matchId)
      }
    })
    
    toDelete.forEach(matchId => {
      activationStates.delete(matchId)
      const timeout = activationTimeouts.get(matchId)
      if (timeout) {
        clearTimeout(timeout)
        activationTimeouts.delete(matchId)
      }
    })
    
    if (toDelete.length > 0) {
      console.log('🧹 Cleaned up', toDelete.length, 'old activation states')
    }
  }
}
