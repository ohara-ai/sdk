import { Address, Hash } from 'viem'
import { getConfig } from '../config/oharaConfig'
import { ApiError, ConfigError, ContractExecutionError } from '../errors'

/**
 * Ohara API Client - Server-side only
 * Handles communication with the Ohara Controller API for managed deployments and operations
 */

// Request/Response Types
export interface ApiResponseMeta {
  httpStatusCode: number
  httpStatus: string
  timestamp: string
  requestId: string
  path: string
  query: Record<string, unknown>
  version: string
  duration: number
}

export interface ApiResponse<T> {
  meta: ApiResponseMeta
  data: T
}

export interface WalletInfo {
  address: Address
  balance: string
  lastFundedAt?: string
}

export interface DeployContractRequest {
  factoryType: 'MatchFactory' | 'ScoreFactory'
  scoreAddress?: string
  chainId: number
}

export interface DeployContractResponse {
  contractAddress: Address
  txHash: Hash
  contractType: 'Match' | 'Score'
  deploymentId: string
}

export interface ExecuteContractFunctionRequest {
  contractAddress: Address
  functionName: string
  params: Record<string, unknown>
  chainId: number
}

export interface ExecuteContractFunctionResponse {
  txHash: Hash
  transactionId: string
  status: string
}

export interface TransactionStatus {
  txHash: Hash
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  gasUsed?: string
  errorMessage?: string
  createdAt: string
}

export interface ContractFactory {
  id: string
  name: string
  factoryType: string
  address: Address
  deployFunctionAbi: unknown
  chainId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DeployedContract {
  id: string
  controllerWalletId: string
  factoryId: string
  contractType: string
  contractAddress: Address
  deploymentTxHash: Hash
  deploymentParams: Record<string, unknown>
  chainId: number
  userId: string
  miniappId: string
  createdAt: string
  updatedAt: string
  factory?: ContractFactory
}

export class OharaApiClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl?: string, token?: string) {
    // Use provided values or fall back to config
    if (baseUrl && token) {
      this.baseUrl = baseUrl
      this.token = token
    } else {
      const config = getConfig()
      if (!config.api) {
        throw new ConfigError(
          'Ohara API mode is not configured. Set OHARA_API_URL and OHARA_CONTROLLER_TOKEN environment variables.',
        )
      }
      this.baseUrl = config.api.url
      this.token = config.api.token
    }
  }

  /**
   * Check if the API client is configured (both token and URL are set)
   */
  static isConfigured(): boolean {
    return getConfig().isApiMode
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }

    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store', // Prevent Next.js from caching API requests
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `Ohara API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        { url, method, statusText: response.statusText },
      )
    }

    return response.json()
  }

  /**
   * Get the controller wallet information
   */
  async getWallet(): Promise<ApiResponse<WalletInfo>> {
    return this.request<ApiResponse<WalletInfo>>(
      'GET',
      '/v2/miniapp-controller/wallet',
    )
  }

  /**
   * Deploy a contract via the Ohara API
   */
  async deployContract(
    request: DeployContractRequest,
  ): Promise<ApiResponse<DeployContractResponse>> {
    return this.request<ApiResponse<DeployContractResponse>>(
      'POST',
      '/v2/miniapp-controller/deploy',
      request,
    )
  }

  /**
   * Execute a contract function via the Ohara API
   */
  async executeContractFunction(
    request: ExecuteContractFunctionRequest,
  ): Promise<ApiResponse<ExecuteContractFunctionResponse>> {
    return this.request<ApiResponse<ExecuteContractFunctionResponse>>(
      'POST',
      '/v2/miniapp-controller/execute',
      request,
    )
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    txHash: Hash,
  ): Promise<ApiResponse<TransactionStatus>> {
    return this.request<ApiResponse<TransactionStatus>>(
      'GET',
      `/v2/miniapp-controller/transaction/${txHash}`,
    )
  }

  /**
   * Wait for a transaction to be confirmed or failed
   * Polls the transaction status until it's no longer pending
   */
  async waitForTransaction(
    txHash: Hash,
    options: {
      pollingInterval?: number
      timeout?: number
    } = {},
  ): Promise<TransactionStatus> {
    const pollingInterval = options.pollingInterval || 2000 // 2 seconds
    const timeout = options.timeout || 60000 // 60 seconds
    const startTime = Date.now()

    while (true) {
      const response = await this.getTransactionStatus(txHash)
      const status = response.data

      if (status.status !== 'PENDING') {
        return status
      }

      if (Date.now() - startTime > timeout) {
        throw new ContractExecutionError(
          `Transaction ${txHash} timed out after ${timeout}ms`,
          txHash,
          { timeout, elapsed: Date.now() - startTime },
        )
      }

      await new Promise((resolve) => setTimeout(resolve, pollingInterval))
    }
  }

  /**
   * Get all deployed contracts for the miniapp
   */
  async getContracts(): Promise<ApiResponse<DeployedContract[]>> {
    return this.request<ApiResponse<DeployedContract[]>>(
      'GET',
      '/v2/miniapp-controller/contracts',
    )
  }
}

/**
 * Get or create singleton Ohara API client instance
 */
let clientInstance: OharaApiClient | null = null

export function getOharaApiClient(): OharaApiClient {
  if (!clientInstance) {
    clientInstance = new OharaApiClient()
  }
  return clientInstance
}

/**
 * Clear the cached client instance
 */
export function clearOharaApiClient() {
  clientInstance = null
}
