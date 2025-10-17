export interface MatchBoardProps {
  /** GameMatch contract address. If not provided, will be resolved from OharaAiProvider context */
  gameMatchAddress?: `0x${string}`
  /** Preset number of max players for the game. If provided, users cannot change this value. */
  presetMaxPlayers?: number
  onMatchCreated?: (matchId: bigint) => void
  onMatchJoined?: (matchId: bigint) => void
  onMatchActivated?: (matchId: bigint) => void
  onMatchFull?: (matchId: bigint) => void
  onMatchLeft?: () => void
  /** Called when any player withdraws from the match (including other players) */
  onPlayerWithdrew?: (matchId: bigint, player: string) => void
  countdownSeconds?: number | null
  isActivating?: boolean
  className?: string
}

export interface MatchInfo {
  id: bigint
  token: `0x${string}`
  stakeAmount: bigint
  maxPlayers: bigint
  players: readonly `0x${string}`[]
  status: number
  winner: `0x${string}`
  createdAt: bigint
}
