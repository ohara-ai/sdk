import { ComponentMetadata, ContractDependency, ContractType } from '../types/contracts'
import { COMPONENT_REGISTRY, ComponentName } from '../metadata/componentDependencies'

/**
 * Get contract dependencies for a list of components
 * @param components - Array of component names used in the app
 * @returns Aggregated list of unique contract dependencies
 */
export function getContractDependencies(
  components: ComponentName[]
): ContractDependency[] {
  const dependencyMap = new Map<ContractType, ContractDependency>()

  for (const componentName of components) {
    const metadata = COMPONENT_REGISTRY[componentName]
    if (!metadata) {
      console.warn(`Component "${componentName}" not found in registry`)
      continue
    }

    for (const dep of metadata.dependencies) {
      const existing = dependencyMap.get(dep.contract)
      // If contract is already tracked, upgrade to required if any component requires it
      if (existing) {
        if (dep.required && !existing.required) {
          dependencyMap.set(dep.contract, { ...dep, required: true })
        }
      } else {
        dependencyMap.set(dep.contract, dep)
      }
    }
  }

  return Array.from(dependencyMap.values())
}

/**
 * Get required contracts only
 * @param components - Array of component names used in the app
 * @returns List of required contract dependencies
 */
export function getRequiredContracts(
  components: ComponentName[]
): ContractDependency[] {
  return getContractDependencies(components).filter((dep) => dep.required)
}

/**
 * Get optional contracts only
 * @param components - Array of component names used in the app
 * @returns List of optional contract dependencies
 */
export function getOptionalContracts(
  components: ComponentName[]
): ContractDependency[] {
  return getContractDependencies(components).filter((dep) => !dep.required)
}

/**
 * Validate that all required contracts are configured
 * @param components - Array of component names used in the app
 * @param env - Environment variables object (e.g., process.env)
 * @returns Object with validation status and missing contracts
 */
export function validateContractConfiguration(
  components: ComponentName[],
  env: Record<string, string | undefined>
): {
  valid: boolean
  missing: ContractDependency[]
  configured: ContractDependency[]
} {
  const required = getRequiredContracts(components)
  const missing: ContractDependency[] = []
  const configured: ContractDependency[] = []

  for (const dep of required) {
    if (!dep.envVar) {
      // No env var specified, skip validation
      configured.push(dep)
      continue
    }

    const value = env[dep.envVar]
    if (!value || value === '0x0000000000000000000000000000000000000000') {
      missing.push(dep)
    } else {
      configured.push(dep)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    configured,
  }
}

/**
 * Get metadata for a specific component
 * @param componentName - Name of the component
 * @returns Component metadata or undefined if not found
 */
export function getComponentMetadata(
  componentName: ComponentName
): ComponentMetadata | undefined {
  return COMPONENT_REGISTRY[componentName]
}

/**
 * Get all components that depend on a specific contract
 * @param contractType - Type of contract to check
 * @returns Array of component names that depend on this contract
 */
export function getComponentsByContract(
  contractType: ContractType
): ComponentName[] {
  return (Object.keys(COMPONENT_REGISTRY) as ComponentName[]).filter((name) => {
    const metadata = COMPONENT_REGISTRY[name]
    return metadata.dependencies.some((dep) => dep.contract === contractType)
  })
}
