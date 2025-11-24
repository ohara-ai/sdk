import crypto from 'crypto'

/**
 * Simple symmetric encryption for key storage
 * Uses AES-256-GCM for authenticated encryption
 * 
 * WARNING: This is a backend-side hardening measure.
 * Keys should NEVER be stored in browser environments.
 * For production, use Ohara API mode or a secure key management service.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits

/**
 * Derive a 256-bit key from the encryption secret
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypt a string value
 * Returns base64-encoded format: iv:authTag:encryptedData
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encryptedData (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt a string value
 * Expects format: iv:authTag:encryptedData (base64)
 */
export function decrypt(ciphertext: string, secret: string): string {
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

/**
 * Check if encryption is enabled (secret is configured)
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.OHARA_KEY_ENCRYPTION_SECRET
}

/**
 * Get the encryption secret from environment
 */
export function getEncryptionSecret(): string | undefined {
  return process.env.OHARA_KEY_ENCRYPTION_SECRET
}
