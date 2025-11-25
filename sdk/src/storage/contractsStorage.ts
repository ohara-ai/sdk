import fs from 'fs/promises'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const CONTRACTS_PATH = path.join(STORAGE_DIR, 'contracts.json')

// Contract addresses organized by context
export interface OharaContracts {
  token?: string
}

export interface GameContracts {
  match?: string
  score?: string
}

export interface AppContracts {
  coin?: string
}

export interface ContractAddresses {
  ohara?: OharaContracts
  game?: GameContracts
  app?: AppContracts
}

interface ContractsStorage {
  [chainId: string]: ContractAddresses
}

/**
 * Ensure storage directory and contracts file exist
 */
export async function ensureContractsStorageExists(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch {
    // Directory might already exist
  }

  try {
    await fs.access(CONTRACTS_PATH)
  } catch {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify({}, null, 2))
  }
}

/**
 * Read contracts from local storage
 */
export async function readContracts(): Promise<ContractsStorage> {
  await ensureContractsStorageExists()

  try {
    const content = await fs.readFile(CONTRACTS_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading contract storage:', error)
    return {}
  }
}

/**
 * Get contracts for a specific chain from local storage
 */
export async function getContractsFromLocal(
  chainId: number,
): Promise<ContractAddresses> {
  const storage = await readContracts()
  return storage[chainId.toString()] || {}
}

/**
 * Update contracts in local storage
 */
export async function updateContracts(
  chainId: number,
  addresses: Partial<ContractAddresses>,
): Promise<void> {
  const storage = await readContracts()
  const chainKey = chainId.toString()

  storage[chainKey] = {
    ...storage[chainKey],
    ...addresses,
  }

  await ensureContractsStorageExists()

  try {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify(storage, null, 2))
  } catch (error) {
    console.error('Error writing contract storage:', error)
    throw error
  }
}

/**
 * Set a specific contract address in local storage
 */
export async function setContractAddress(
  chainId: number,
  context: keyof ContractAddresses,
  contractType: string,
  address: string,
): Promise<void> {
  const storage = await readContracts()
  const chainKey = chainId.toString()

  if (!storage[chainKey]) {
    storage[chainKey] = {}
  }

  if (!storage[chainKey][context]) {
    storage[chainKey][context] = {}
  }

  // @ts-expect-error - dynamic property assignment
  storage[chainKey][context][contractType] = address

  await ensureContractsStorageExists()

  try {
    await fs.writeFile(CONTRACTS_PATH, JSON.stringify(storage, null, 2))
  } catch (error) {
    console.error('Error writing contract address:', error)
    throw error
  }
}
