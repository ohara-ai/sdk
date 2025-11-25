import fs from 'fs/promises'
import path from 'path'
import { privateKeyToAccount } from 'viem/accounts'
import { Address } from 'viem'
import {
  encrypt,
  decrypt,
  isEncryptionEnabled,
  getEncryptionSecret,
} from './encryption'

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const KEYS_PATH = path.join(STORAGE_DIR, 'keys.json')

export interface KeyStorage {
  [key: string]: string
}

/**
 * Ensure storage directory and keys file exist
 */
async function ensureKeysStorageExists(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch {
    // Directory might already exist
  }

  try {
    await fs.access(KEYS_PATH)
  } catch {
    await fs.writeFile(KEYS_PATH, JSON.stringify({}, null, 2))
  }
}

/**
 * Read keys from storage
 */
async function readKeys(): Promise<KeyStorage> {
  await ensureKeysStorageExists()

  try {
    const content = await fs.readFile(KEYS_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading keys storage:', error)
    return {}
  }
}

/**
 * Get a key from storage (with optional decryption)
 */
async function getKey(keyName: string): Promise<string | undefined> {
  const keys = await readKeys()
  const storedValue = keys[keyName]

  if (!storedValue) return undefined

  // Decrypt if encryption is enabled
  if (isEncryptionEnabled()) {
    const secret = getEncryptionSecret()
    if (!secret) return undefined

    try {
      return decrypt(storedValue, secret)
    } catch (error) {
      console.error('Error decrypting key:', error)
      throw new Error('Failed to decrypt key. Check OHARA_KEY_ENCRYPTION_SECRET.')
    }
  }

  return storedValue
}

/**
 * Set a key in storage (with optional encryption)
 */
async function setKey(keyName: string, value: string): Promise<void> {
  const keys = await readKeys()

  // Encrypt if encryption is enabled
  let valueToStore = value
  if (isEncryptionEnabled()) {
    const secret = getEncryptionSecret()
    if (!secret) {
      throw new Error('OHARA_KEY_ENCRYPTION_SECRET is required for encryption')
    }
    valueToStore = encrypt(value, secret)
  }

  keys[keyName] = valueToStore

  await ensureKeysStorageExists()

  try {
    await fs.writeFile(KEYS_PATH, JSON.stringify(keys, null, 2))
  } catch (error) {
    console.error('Error writing keys storage:', error)
    throw error
  }
}

/**
 * Get the controller private key from storage
 * 
 * WARNING: This is a backend/dev utility. Controller keys should NEVER
 * be stored or accessed in browser environments.
 * 
 * For production deployments, use Ohara API mode instead of storing keys locally.
 * 
 * If OHARA_KEY_ENCRYPTION_SECRET is set, keys are encrypted at rest.
 * This provides defense-in-depth but does NOT make local key storage production-safe.
 * 
 * @throws {Error} If called in API mode (keys are managed by Ohara API)
 */
export async function getControllerKey(
  isApiMode: boolean,
): Promise<string> {
  if (isApiMode) {
    throw new Error('Controller key is not available in API mode')
  }
  const key = await getKey('controller')

  if (key) return key

  // Generate a new random private key if none exists
  const randomBytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes)
  } else {
    // Fallback for Node.js
    const nodeCrypto = await import('crypto')
    const randomBuffer = nodeCrypto.randomBytes(32)
    randomBytes.set(randomBuffer)
  }

  const newPrivateKey =
    '0x' +
    Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

  await setKey('controller', newPrivateKey)

  return newPrivateKey
}

/**
 * Get the controller address from a private key
 */
export function deriveControllerAddress(privateKey: string): Address {
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  return account.address
}
