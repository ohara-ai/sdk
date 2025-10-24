// Server-only exports - DO NOT import from client components
import 'server-only'

// Storage (server-side only)
export {
  getContracts,
  updateContracts,
  setContractAddress,
  getControllerKey,
  getControllerAddress,
  type ContractAddresses,
  type OharaContracts,
  type GameContracts,
  type AppContracts,
} from './storage/contractStorage'

// Server-side Context
export {
  createServerOharaAi,
  clearOharaAiCache,
  type ServerOharaAiContext,
} from './server/createServerContext'

// Deployment (server-side only)
export {
  deployGameMatch,
  deployGameScore,
  getDeploymentConfig,
  getFactoryAddresses,
  type DeploymentConfig,
  type GameMatchDeployParams,
  type GameScoreDeployParams,
} from './deployment/deploymentService'
