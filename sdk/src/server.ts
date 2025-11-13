// Server-only exports - DO NOT import from client components
import 'server-only'

// Deployment types
export type { DeploymentResult } from './deployment/deploymentService'

// Storage (server-side only)
export {
  getContracts,
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

// Ohara API Client (for managed deployments and function calls)
export {
  OharaApiClient,
  getOharaApiClient,
  clearOharaApiClient,
  type WalletInfo,
  type DeployContractRequest,
  type DeployContractResponse,
  type ExecuteContractFunctionRequest,
  type ExecuteContractFunctionResponse,
  type TransactionStatus,
} from './server/oharaApiClient'

// Server-only types
export {
  type ServerMatchOperations,
} from './core/game/match'

export {
  type ServerGameContext,
} from './context/OharaAiContext'

// Deployment (server-side only)
export {
  deployGameMatch,
  deployGameScore,
  getDeploymentConfig,
  getFactoryAddresses,
  type DeploymentConfig,
} from './deployment/deploymentService'
