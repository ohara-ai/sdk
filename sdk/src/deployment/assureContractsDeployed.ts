import fs from 'fs/promises'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { storagePaths, getConfig, getPreferredChainId } from '../config'
import { getContracts, getControllerKey, getControllerAddress } from '../storage/contractStorage'
import { OharaApiClient } from '../server/oharaApiClient'
import { ConfigError } from '../errors'
import {
  CONTRACT_CONFIG,
  getContractDependencies,
  type ContractType,
  type PermissionContext,
  type PermissionAction,
} from './contractConfig'

// Re-export types for consumers
export type { ContractType, PermissionContext, PermissionAction } from './contractConfig'

// =============================================================================
// DEPLOYMENT LOCK (prevents concurrent deployments)
// =============================================================================

/**
 * In-memory lock to prevent concurrent deployment operations.
 * When multiple requests call assureContractsDeployed simultaneously,
 * subsequent callers wait for the first deployment to complete and then
 * return the cached result (since contracts will already be deployed).
 */
const deploymentLocks = new Map<number, Promise<AssureContractsDeployedResult>>()

// =============================================================================
// DEPLOYMENT RESULT TYPES
// =============================================================================

/**
 * Status of a contract in the deployment plan
 */
type DeploymentStatus =
  | 'pending'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'already_exists'

/**
 * Individual deployment result
 */
export interface ContractDeploymentResult {
  type: ContractType
  status: DeploymentStatus
  contractAddress?: string
  txHash?: string
  error?: string
  dependsOn?: ContractType[]
}

/**
 * Result of a permission setting operation
 */
export interface PermissionResult {
  description: string
  success: boolean
  txHash?: string
  error?: string
}

/**
 * Overall result of assureContractsDeployed
 */
export interface AssureContractsDeployedResult {
  success: boolean
  message: string
  chainId: number
  results: ContractDeploymentResult[]
  deployedContracts: Record<string, string>
  totalDeployed: number
  totalFailed: number
  totalExisting: number
  permissionResults?: PermissionResult[]
}

// =============================================================================
// DEPLOYMENT PLAN LOGIC
// =============================================================================

/**
 * Topologically sort contracts based on dependencies
 * Ensures contracts are deployed in the correct order
 * 
 * @internal Exported for testing purposes
 */
export function createDeploymentPlan(
  contractTypes: ContractType[],
): { type: ContractType; dependsOn: ContractType[] }[] {
  const requestedTypes = new Set(contractTypes)

  // Topological sort using Kahn's algorithm
  const inDegree = new Map<ContractType, number>()
  const graph = new Map<ContractType, ContractType[]>()

  // Initialize
  for (const type of requestedTypes) {
    inDegree.set(type, 0)
    graph.set(type, [])
  }

  // Build dependency graph (only for requested types)
  for (const type of requestedTypes) {
    const deps = getContractDependencies(type).filter((dep) =>
      requestedTypes.has(dep),
    )
    for (const dep of deps) {
      const current = graph.get(dep) || []
      current.push(type)
      graph.set(dep, current)
      inDegree.set(type, (inDegree.get(type) || 0) + 1)
    }
  }

  // Process nodes with no dependencies first
  const queue: ContractType[] = []
  const result: { type: ContractType; dependsOn: ContractType[] }[] = []

  for (const [type, degree] of inDegree) {
    if (degree === 0) {
      queue.push(type)
    }
  }

  while (queue.length > 0) {
    const type = queue.shift()!
    const deps = getContractDependencies(type).filter((dep) =>
      requestedTypes.has(dep),
    )

    result.push({
      type,
      dependsOn: deps,
    })

    for (const dependent of graph.get(type) || []) {
      const newDegree = (inDegree.get(dependent) || 1) - 1
      inDegree.set(dependent, newDegree)
      if (newDegree === 0) {
        queue.push(dependent)
      }
    }
  }

  // Check for cycles
  if (result.length !== requestedTypes.size) {
    throw new Error('Circular dependency detected in contract deployment plan')
  }

  return result
}

/**
 * Requirements file structure
 */
interface RequirementsFile {
  contracts?: string[]
}

/**
 * Read required contracts from requirements.json file
 * Returns empty array if file doesn't exist or can't be read
 */
async function getRequiredContracts(): Promise<ContractType[]> {
  try {
    const requirementsPath = storagePaths.requirements()
    const content = await fs.readFile(requirementsPath, 'utf-8')
    const data: RequirementsFile = JSON.parse(content)

    if (!data.contracts || !Array.isArray(data.contracts)) {
      console.log('[assureContractsDeployed] No contracts array in requirements.json')
      return []
    }

    // Filter to only supported contract types
    const validContracts = data.contracts.filter(
      (c): c is ContractType => c === 'Score' || c === 'Match' || c === 'Prize' || c === 'League' || c === 'Tournament' || c === 'Prediction' || c === 'Heap',
    )

    console.log(
      `[assureContractsDeployed] Loaded ${validContracts.length} required contract(s) from requirements.json:`,
      validContracts.join(', ') || 'none',
    )

    return validContracts
  } catch (error) {
    // File doesn't exist or can't be parsed - return empty array
    console.log(
      '[assureContractsDeployed] Could not read requirements.json, using empty array:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}

/**
 * Check if a contract address actually has code deployed on-chain
 */
async function contractExistsOnChain(
  address: string | undefined,
  rpcUrl: string,
): Promise<boolean> {
  if (!address) return false

  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    })

    const code = await publicClient.getCode({
      address: address as `0x${string}`,
    })

    return !!code && code !== '0x'
  } catch {
    return false
  }
}

/**
 * Get existing contracts using the SDK's getContracts function
 * This handles both API mode and local storage fallback
 * 
 * Also verifies that stored addresses actually exist on-chain
 * (handles cases where chain was reset but storage wasn't cleared)
 */
async function getExistingContracts(
  chainId: number,
): Promise<Map<ContractType, { address: string }>> {
  const contractMap = new Map<ContractType, { address: string }>()
  const config = getConfig()
  const rpcUrl = config.rpcUrl

  try {
    const contracts = await getContracts(chainId)

    // Check for Score contract in game context and verify on-chain
    if (contracts.game?.score) {
      const existsOnChain = await contractExistsOnChain(contracts.game.score, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Score', { address: contracts.game.score })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Score address ${contracts.game.score} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for Match contract in game context and verify on-chain
    if (contracts.game?.match) {
      const existsOnChain = await contractExistsOnChain(contracts.game.match, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Match', { address: contracts.game.match })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Match address ${contracts.game.match} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for Prize contract in game context and verify on-chain
    if (contracts.game?.prize) {
      const existsOnChain = await contractExistsOnChain(contracts.game.prize, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Prize', { address: contracts.game.prize })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Prize address ${contracts.game.prize} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for Prediction contract in game context and verify on-chain
    if (contracts.game?.prediction) {
      const existsOnChain = await contractExistsOnChain(contracts.game.prediction, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Prediction', { address: contracts.game.prediction })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Prediction address ${contracts.game.prediction} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for League contract in game context and verify on-chain
    if (contracts.game?.league) {
      const existsOnChain = await contractExistsOnChain(contracts.game.league, rpcUrl)
      if (existsOnChain) {
        contractMap.set('League', { address: contracts.game.league })
      } else {
        console.log(
          `[assureContractsDeployed] Stored League address ${contracts.game.league} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for Tournament contract in game context and verify on-chain
    if (contracts.game?.tournament) {
      const existsOnChain = await contractExistsOnChain(contracts.game.tournament, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Tournament', { address: contracts.game.tournament })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Tournament address ${contracts.game.tournament} not found on-chain (will redeploy)`,
        )
      }
    }

    // Check for Heap contract in game context and verify on-chain
    if (contracts.game?.heap) {
      const existsOnChain = await contractExistsOnChain(contracts.game.heap, rpcUrl)
      if (existsOnChain) {
        contractMap.set('Heap', { address: contracts.game.heap })
      } else {
        console.log(
          `[assureContractsDeployed] Stored Heap address ${contracts.game.heap} not found on-chain (will redeploy)`,
        )
      }
    }
  } catch (error) {
    console.warn('Failed to fetch existing contracts:', error)
  }

  return contractMap
}

// =============================================================================
// PERMISSIONS SETTING
// =============================================================================

/**
 * Collect all permission actions from contract configs
 */
function collectPermissionActions(context: PermissionContext): PermissionAction[] {
  const actions: PermissionAction[] = []
  
  for (const contractType of Object.keys(CONTRACT_CONFIG) as ContractType[]) {
    const config = CONTRACT_CONFIG[contractType]
    const contractActions = config.getPermissionActions(context)
    actions.push(...contractActions)
  }
  
  return actions
}

/**
 * Execute permission actions on deployed contracts
 * 
 * Collects permission actions from all contract configs and executes them.
 * In API mode, permissions are handled by the Ohara API.
 */
async function executePermissions(
  context: PermissionContext,
): Promise<PermissionResult[]> {
  const results: PermissionResult[] = []

  // In API mode, permissions are handled by the API
  if (OharaApiClient.isConfigured()) {
    console.log('[executePermissions] API mode - permissions handled by Ohara API')
    return results
  }

  // Collect all permission actions from configs
  const actions = collectPermissionActions(context)
  
  if (actions.length === 0) {
    console.log('[executePermissions] No permission actions needed')
    return results
  }

  // Get controller private key for transactions
  let privateKey: string
  try {
    privateKey = await getControllerKey()
  } catch (error) {
    console.error('[executePermissions] Failed to get controller key:', error)
    return results
  }

  const config = getConfig()
  const rpcUrl = config.rpcUrl
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  })
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  })

  // Execute each permission action
  for (const action of actions) {
    console.log(`[executePermissions] ${action.description}`)
    
    try {
      const txHash = await walletClient.writeContract({
        address: action.targetContract as `0x${string}`,
        abi: action.abi as any,
        functionName: action.functionName as any,
        args: action.args as any,
        chain: null,
        account,
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      
      results.push({
        description: action.description,
        success: true,
        txHash,
      })
      console.log(`[executePermissions] Success, tx: ${txHash}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[executePermissions] Failed: ${errorMessage}`)
      results.push({
        description: action.description,
        success: false,
        error: errorMessage,
      })
    }
  }

  return results
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Ensure required contracts are deployed for the SDK
 *
 * This function checks for existing Score and Match contracts and deploys
 * any that are missing. It handles dependencies automatically (Score must
 * be deployed before Match).
 *
 * @param chainId - Optional chain ID (defaults to NEXT_PUBLIC_SDK_CHAIN_ID)
 * @returns Result object with deployment status and addresses
 *
 * @example
 * ```ts
 * // In your API route (e.g., /api/sdk/addresses)
 * import { assureContractsDeployed } from '@ohara-ai/sdk/server'
 *
 * export async function GET() {
 *   // Ensure contracts are deployed before returning addresses
 *   // Uses NEXT_PUBLIC_SDK_CHAIN_ID automatically
 *   const deployResult = await assureContractsDeployed()
 *
 *   if (!deployResult.success) {
 *     console.error('Contract deployment failed:', deployResult.message)
 *   }
 *
 *   // Continue to return addresses...
 * }
 * ```
 */
export async function assureContractsDeployed(
  chainId?: number,
): Promise<AssureContractsDeployedResult> {
  // Resolve chainId from config if not provided
  const resolvedChainId = chainId ?? getPreferredChainId()
  if (resolvedChainId === undefined) {
    throw new ConfigError(
      'No chainId provided and NEXT_PUBLIC_SDK_CHAIN_ID is not configured',
    )
  }

  // Check if there's already a deployment in progress for this chain
  const existingDeployment = deploymentLocks.get(resolvedChainId)
  if (existingDeployment) {
    console.log(`[assureContractsDeployed] Waiting for in-flight deployment on chainId ${resolvedChainId}`)
    try {
      await existingDeployment
    } catch {
      // Ignore errors from the original deployment - we'll re-check state below
    }
    // After waiting, re-run to check current state (contracts may now be deployed)
    // Don't recurse if there's still a lock (shouldn't happen, but safety check)
    if (!deploymentLocks.has(resolvedChainId)) {
      return assureContractsDeployed(chainId)
    }
  }

  // Create the deployment promise and store it in the lock map
  const deploymentPromise = executeDeployment(resolvedChainId)
  deploymentLocks.set(resolvedChainId, deploymentPromise)

  try {
    const result = await deploymentPromise
    return result
  } finally {
    // Always release the lock when done
    deploymentLocks.delete(resolvedChainId)
  }
}

/**
 * Internal function that executes the actual deployment logic.
 * This is separated from assureContractsDeployed to enable the locking mechanism.
 */
async function executeDeployment(
  resolvedChainId: number,
): Promise<AssureContractsDeployedResult> {
  console.log(`[assureContractsDeployed] Starting for chainId ${resolvedChainId}`)

  // Load required contracts from requirements.json (empty array if file doesn't exist)
  const requiredContracts = await getRequiredContracts()

  // If no contracts are required, return early with success
  if (requiredContracts.length === 0) {
    console.log('[assureContractsDeployed] No contracts required, skipping deployment')
    return {
      success: true,
      message: 'No contracts required. Skipping deployment.',
      chainId: resolvedChainId,
      results: [],
      deployedContracts: {},
      totalDeployed: 0,
      totalFailed: 0,
      totalExisting: 0,
    }
  }

  // Fetch existing contracts
  const existingContracts = await getExistingContracts(resolvedChainId)
  console.log(
    `[assureContractsDeployed] Found ${existingContracts.size} existing contract(s):`,
    Array.from(existingContracts.keys()).join(', ') || 'none',
  )

  // Create deployment plan
  const deploymentPlan = createDeploymentPlan(requiredContracts)

  // Initialize results
  const results: ContractDeploymentResult[] = deploymentPlan.map((item) => {
    const existing = existingContracts.get(item.type)
    if (existing) {
      return {
        type: item.type,
        status: 'already_exists' as const,
        contractAddress: existing.address,
        dependsOn: item.dependsOn,
      }
    }
    return {
      type: item.type,
      status: 'pending' as const,
      dependsOn: item.dependsOn,
    }
  })

  // Track deployed addresses (pre-populate with existing)
  const deployedAddresses: Record<string, string> = {}
  for (const [type, info] of existingContracts) {
    deployedAddresses[type] = info.address
  }

  // Count pending vs existing
  const pendingCount = results.filter((r) => r.status === 'pending').length
  const existingCount = results.filter(
    (r) => r.status === 'already_exists',
  ).length

  // If all contracts already exist, return early
  if (pendingCount === 0) {
    console.log(
      `[assureContractsDeployed] All ${existingCount} contract(s) already exist`,
    )
    return {
      success: true,
      message: `All ${existingCount} contract(s) already deployed. No new deployments needed.`,
      chainId: resolvedChainId,
      results,
      deployedContracts: deployedAddresses,
      totalDeployed: 0,
      totalFailed: 0,
      totalExisting: existingCount,
    }
  }

  // Execute deployments in order
  let totalDeployed = 0
  let totalFailed = 0

  for (let i = 0; i < deploymentPlan.length; i++) {
    const planItem = deploymentPlan[i]

    // Skip contracts that already exist
    if (results[i].status === 'already_exists') {
      console.log(
        `[assureContractsDeployed] Skipping ${planItem.type} - already deployed at ${results[i].contractAddress}`,
      )
      continue
    }

    results[i].status = 'deploying'
    console.log(
      `[assureContractsDeployed] Deploying ${planItem.type} (step ${i + 1}/${deploymentPlan.length})`,
    )

    // Check if dependencies are satisfied
    const missingDeps = planItem.dependsOn.filter(
      (dep) => !deployedAddresses[dep],
    )
    if (missingDeps.length > 0) {
      results[i].status = 'skipped'
      results[i].error = `Missing dependencies: ${missingDeps.join(', ')}`
      console.warn(
        `[assureContractsDeployed] Skipping ${planItem.type} due to missing dependencies: ${missingDeps.join(', ')}`,
      )
      continue
    }

    try {
      // Get config for this contract type
      const contractConfig = CONTRACT_CONFIG[planItem.type]
      
      // Build deploy parameters from already deployed contracts
      const deployParams = contractConfig.buildDeployParams(deployedAddresses)
      
      // Deploy using the config's deploy function
      const result = await contractConfig.deploy(deployParams)
      
      results[i].status = 'success'
      results[i].contractAddress = result.address
      results[i].txHash = result.transactionHash
      deployedAddresses[planItem.type] = result.address
      totalDeployed++
      console.log(
        `[assureContractsDeployed] Successfully deployed ${planItem.type} at ${result.address}`,
      )
    } catch (error) {
      results[i].status = 'failed'
      results[i].error =
        error instanceof Error ? error.message : 'Unknown deployment error'
      totalFailed++
      console.error(
        `[assureContractsDeployed] Failed to deploy ${planItem.type}:`,
        error,
      )
      // Continue with next deployment - don't fail the entire batch
    }
  }

  // Track which contracts were deployed in this batch
  const deployedInBatch = new Set<ContractType>(
    results
      .filter((r): r is ContractDeploymentResult & { status: 'success' } => r.status === 'success')
      .map((r) => r.type),
  )

  // Build permission context
  const controllerAddress = await getControllerAddress()
  const permissionContext: PermissionContext = {
    deployedAddresses,
    deployedInBatch,
    requiredContracts,
    controllerAddress,
  }

  // Set permissions after all deployments are complete
  console.log('[assureContractsDeployed] Setting contract permissions...')
  const permissionResults = await executePermissions(permissionContext)

  // Count permission failures
  const permissionFailures = permissionResults.filter((r: PermissionResult) => !r.success).length
  const permissionSuccesses = permissionResults.filter((r: PermissionResult) => r.success).length

  // Build result message
  const success = totalFailed === 0 && permissionFailures === 0
  const messageParts: string[] = []

  if (totalDeployed > 0) {
    messageParts.push(`deployed ${totalDeployed} new contract(s)`)
  }
  if (existingCount > 0) {
    messageParts.push(`${existingCount} already existed`)
  }
  if (totalFailed > 0) {
    messageParts.push(`${totalFailed} deployment(s) failed`)
  }
  if (permissionSuccesses > 0) {
    messageParts.push(`${permissionSuccesses} permission(s) set`)
  }
  if (permissionFailures > 0) {
    messageParts.push(`${permissionFailures} permission(s) failed`)
  }

  const message =
    messageParts.length > 0
      ? `Contract deployment complete: ${messageParts.join(', ')}`
      : 'No contracts to deploy'

  console.log(`[assureContractsDeployed] ${message}`)

  return {
    success,
    message,
    chainId: resolvedChainId,
    results,
    deployedContracts: deployedAddresses,
    totalDeployed,
    totalFailed,
    totalExisting: existingCount,
    permissionResults,
  }
}
