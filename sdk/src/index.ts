// Components
export { LeaderBoard } from './components/LeaderBoard'
export type { LeaderBoardProps } from './components/LeaderBoard'

export { WageringBox } from './components/WageringBox'
export type { WageringBoxProps } from './components/WageringBox'

// Provider & Context
export { 
  OharaAiProvider, 
  useOharaAi,
  useComponentRegistration,
} from './context/OnchainContext'

// ABIs
export { SCOREBOARD_ABI } from './abis/scoreboard'
export { GAME_MATCH_ABI, MatchStatus } from './abis/gameMatch'

// Contract Dependencies
export { ContractType } from './types/contracts'
export type { ContractDependency, ComponentMetadata } from './types/contracts'
export { 
  COMPONENT_REGISTRY,
  LEADERBOARD_METADATA,
  WAGERING_BOX_METADATA,
  type ComponentName,
} from './metadata/componentDependencies'
export {
  getContractDependencies,
  getRequiredContracts,
  getOptionalContracts,
  validateContractConfiguration,
  getComponentMetadata,
  getComponentsByContract,
} from './utils/dependencies'

// Utils
export { cn } from './utils/cn'
export { formatAddress, formatTokenAmount } from './utils/format'
