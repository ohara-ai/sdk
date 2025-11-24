/**
 * Base error class for all Ohara SDK errors
 */
export class OharaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'OharaError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Configuration or environment variable errors
 */
export class ConfigError extends OharaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details)
    this.name = 'ConfigError'
  }
}

/**
 * File system or storage errors
 */
export class StorageError extends OharaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', details)
    this.name = 'StorageError'
  }
}

/**
 * Ohara API communication errors
 */
export class ApiError extends OharaError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, 'API_ERROR', { ...details, statusCode })
    this.name = 'ApiError'
  }
}

/**
 * Contract execution or blockchain transaction errors
 */
export class ContractExecutionError extends OharaError {
  constructor(
    message: string,
    public readonly txHash?: string,
    details?: Record<string, unknown>,
  ) {
    super(message, 'CONTRACT_EXECUTION_ERROR', { ...details, txHash })
    this.name = 'ContractExecutionError'
  }
}

/**
 * Validation errors (invalid parameters, etc.)
 */
export class ValidationError extends OharaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Type guard to check if an error is an OharaError
 */
export function isOharaError(error: unknown): error is OharaError {
  return error instanceof OharaError
}

/**
 * Type guard to check if an error is a ConfigError
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Type guard to check if an error is a ContractExecutionError
 */
export function isContractExecutionError(error: unknown): error is ContractExecutionError {
  return error instanceof ContractExecutionError
}
