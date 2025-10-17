import fs from 'fs/promises'
import path from 'path'

const STORAGE_PATH = path.join(process.cwd(), 'data', 'contracts.json')

export interface ContractAddresses {
  gameMatch?: string
  scoreboard?: string
}

interface StorageData {
  [chainId: string]: ContractAddresses
}

/**
 * Ensure the storage directory and file exist
 */
async function ensureStorageExists(): Promise<void> {
  const dir = path.dirname(STORAGE_PATH)
  
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
  
  try {
    await fs.access(STORAGE_PATH)
  } catch {
    // File doesn't exist, create it with empty object
    await fs.writeFile(STORAGE_PATH, JSON.stringify({}, null, 2))
  }
}

/**
 * Read contract addresses from storage
 */
async function readStorage(): Promise<StorageData> {
  await ensureStorageExists()
  
  try {
    const content = await fs.readFile(STORAGE_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading contract storage:', error)
    return {}
  }
}

/**
 * Write contract addresses to storage
 */
async function writeStorage(data: StorageData): Promise<void> {
  await ensureStorageExists()
  
  try {
    await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing contract storage:', error)
    throw error
  }
}

/**
 * Get contract addresses for a specific chain
 */
export async function getContractAddresses(chainId: number): Promise<ContractAddresses> {
  const storage = await readStorage()
  return storage[chainId.toString()] || {}
}

/**
 * Set a specific contract address for a chain
 */
export async function setContractAddress(
  chainId: number,
  contractType: 'gameMatch' | 'scoreboard',
  address: string
): Promise<void> {
  const storage = await readStorage()
  const chainKey = chainId.toString()
  
  if (!storage[chainKey]) {
    storage[chainKey] = {}
  }
  
  storage[chainKey][contractType] = address
  await writeStorage(storage)
}

/**
 * Update multiple contract addresses for a chain
 */
export async function updateContractAddresses(
  chainId: number,
  addresses: Partial<ContractAddresses>
): Promise<void> {
  const storage = await readStorage()
  const chainKey = chainId.toString()
  
  storage[chainKey] = {
    ...storage[chainKey],
    ...addresses,
  }
  
  await writeStorage(storage)
}

/**
 * Clear all contract addresses for a chain
 */
export async function clearContractAddresses(chainId: number): Promise<void> {
  const storage = await readStorage()
  delete storage[chainId.toString()]
  await writeStorage(storage)
}
