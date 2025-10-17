import { useMemo } from 'react'
import {
  ComponentName,
  getContractDependencies,
  getRequiredContracts,
  validateContractConfiguration,
  ContractDependency,
} from '@/sdk/src'

/**
 * Hook to manage contract dependencies for a demo app
 * @param components - Array of SDK component names used in the app
 */
export function useContractDependencies(components: ComponentName[]) {
  const dependencies = useMemo(() => {
    return getContractDependencies(components)
  }, [components])

  const required = useMemo(() => {
    return getRequiredContracts(components)
  }, [components])

  const validation = useMemo(() => {
    return validateContractConfiguration(components, process.env)
  }, [components])

  return {
    /** All contract dependencies (required + optional) */
    dependencies,
    /** Only required contract dependencies */
    required,
    /** Validation result */
    validation,
    /** Whether all required contracts are configured */
    isValid: validation.valid,
    /** List of missing required contracts */
    missing: validation.missing,
    /** List of properly configured contracts */
    configured: validation.configured,
  }
}

/**
 * Get a user-friendly error message for missing contracts
 */
export function getMissingContractsMessage(
  missing: ContractDependency[]
): string {
  if (missing.length === 0) return ''

  const contractNames = missing.map((dep) => dep.contract).join(', ')
  const envVars = missing
    .filter((dep) => dep.envVar)
    .map((dep) => dep.envVar)
    .join(', ')

  return `Missing required contracts: ${contractNames}. Please configure: ${envVars}`
}
