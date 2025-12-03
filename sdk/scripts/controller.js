// This file provides script-friendly access to controller functionality
// It bypasses the 'server-only' restriction for Node.js scripts
//
// WARNING: Controller keys are for backend/dev use only.
// For production, use Ohara API mode instead of storing keys locally.
const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')
const { privateKeyToAccount } = require('viem/accounts')

// Storage configuration (mirrors oharaConfig.ts)
// See: src/config/oharaConfig.ts -> getStorageDir() and storagePaths
const STORAGE_DIR = path.join(process.cwd(), 'public', 'ohara-ai-data')
const KEYS_PATH = path.join(STORAGE_DIR, 'keys.json')

// Encryption support (matches SDK implementation)
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function isEncryptionEnabled() {
  return !!process.env.OHARA_KEY_ENCRYPTION_SECRET
}

function deriveKey(secret) {
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(plaintext, secret) {
  const key = deriveKey(secret)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

function decrypt(ciphertext, secret) {
  const key = deriveKey(secret)
  const parts = ciphertext.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }
  
  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const encrypted = parts[2]
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

async function ensureStorageExists() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  try {
    await fs.access(KEYS_PATH)
  } catch {
    await fs.writeFile(KEYS_PATH, JSON.stringify({}, null, 2))
  }
}

async function getControllerKey() {
  await ensureStorageExists()

  try {
    const content = await fs.readFile(KEYS_PATH, 'utf-8')
    const keys = JSON.parse(content)
    let key = keys.controller

    if (key) {
      // Decrypt if encryption is enabled
      if (isEncryptionEnabled()) {
        const secret = process.env.OHARA_KEY_ENCRYPTION_SECRET
        try {
          key = decrypt(key, secret)
        } catch (error) {
          console.error('Error decrypting key:', error)
          throw new Error('Failed to decrypt key. Check OHARA_KEY_ENCRYPTION_SECRET.')
        }
      }
      return key
    }

    // Generate a new random private key if none exists
    const randomBytes = crypto.randomBytes(32)
    const newPrivateKey = '0x' + randomBytes.toString('hex')

    // Encrypt if encryption is enabled
    let valueToStore = newPrivateKey
    if (isEncryptionEnabled()) {
      const secret = process.env.OHARA_KEY_ENCRYPTION_SECRET
      if (!secret) {
        throw new Error('OHARA_KEY_ENCRYPTION_SECRET is required for encryption')
      }
      valueToStore = encrypt(newPrivateKey, secret)
    }

    // Save the new key
    keys.controller = valueToStore
    await fs.writeFile(KEYS_PATH, JSON.stringify(keys, null, 2))

    return newPrivateKey
  } catch (error) {
    console.error('Error reading keys storage:', error)
    throw error
  }
}

async function getControllerAddress() {
  const privateKey = await getControllerKey()
  if (!privateKey) {
    throw new Error('No controller key found')
  }
  const account = privateKeyToAccount(privateKey)
  return account.address
}

// Export for CommonJS
module.exports = {
  getControllerKey,
  getControllerAddress,
}
