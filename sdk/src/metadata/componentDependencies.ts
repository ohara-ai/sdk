import { ComponentMetadata, ContractType } from '../types/contracts'

/**
 * Contract dependencies for LeaderBoard component
 */
export const LEADERBOARD_METADATA: ComponentMetadata = {
  name: 'LeaderBoard',
  description: 'Displays ranked players based on wins or prize money',
  dependencies: [
    {
      contract: ContractType.SCOREBOARD,
      required: true,
      envVar: 'NEXT_PUBLIC_SCOREBOARD_ADDRESS',
      description: 'Required to fetch player rankings and statistics',
    },
  ],
}

/**
 * Contract dependencies for WageringBox component
 */
export const WAGERING_BOX_METADATA: ComponentMetadata = {
  name: 'WageringBox',
  description: 'Allows players to create or join wagered matches',
  dependencies: [
    {
      contract: ContractType.GAME_MATCH,
      required: true,
      envVar: 'NEXT_PUBLIC_GAME_MATCH_INSTANCE',
      description: 'Required to create and join wagered game matches',
    },
  ],
}

/**
 * All component metadata indexed by component name
 */
export const COMPONENT_REGISTRY = {
  LeaderBoard: LEADERBOARD_METADATA,
  WageringBox: WAGERING_BOX_METADATA,
} as const

export type ComponentName = keyof typeof COMPONENT_REGISTRY
