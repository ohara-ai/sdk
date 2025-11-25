import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, isEncryptionEnabled, getEncryptionSecret } from './encryption'

describe('encryption', () => {
  const originalEnv = process.env.OHARA_KEY_ENCRYPTION_SECRET

  afterEach(() => {
    // Restore original env
    if (originalEnv) {
      process.env.OHARA_KEY_ENCRYPTION_SECRET = originalEnv
    } else {
      delete process.env.OHARA_KEY_ENCRYPTION_SECRET
    }
  })

  describe('isEncryptionEnabled', () => {
    it('returns false when secret is not set', () => {
      delete process.env.OHARA_KEY_ENCRYPTION_SECRET
      expect(isEncryptionEnabled()).toBe(false)
    })

    it('returns true when secret is set', () => {
      process.env.OHARA_KEY_ENCRYPTION_SECRET = 'test-secret'
      expect(isEncryptionEnabled()).toBe(true)
    })
  })

  describe('getEncryptionSecret', () => {
    it('returns undefined when not set', () => {
      delete process.env.OHARA_KEY_ENCRYPTION_SECRET
      expect(getEncryptionSecret()).toBeUndefined()
    })

    it('returns the secret when set', () => {
      process.env.OHARA_KEY_ENCRYPTION_SECRET = 'test-secret'
      expect(getEncryptionSecret()).toBe('test-secret')
    })
  })

  describe('encrypt and decrypt', () => {
    const secret = 'my-secure-secret-key-for-testing'
    const plaintext = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

    it('encrypts plaintext to a different value', () => {
      const encrypted = encrypt(plaintext, secret)
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted).toContain(':') // Should have format iv:authTag:data
    })

    it('decrypts back to original plaintext', () => {
      const encrypted = encrypt(plaintext, secret)
      const decrypted = decrypt(encrypted, secret)
      expect(decrypted).toBe(plaintext)
    })

    it('produces different ciphertext each time (due to random IV)', () => {
      const encrypted1 = encrypt(plaintext, secret)
      const encrypted2 = encrypt(plaintext, secret)
      expect(encrypted1).not.toBe(encrypted2)
      
      // But both decrypt to the same value
      expect(decrypt(encrypted1, secret)).toBe(plaintext)
      expect(decrypt(encrypted2, secret)).toBe(plaintext)
    })

    it('throws error with wrong secret', () => {
      const encrypted = encrypt(plaintext, secret)
      expect(() => decrypt(encrypted, 'wrong-secret')).toThrow()
    })

    it('throws error with invalid format', () => {
      expect(() => decrypt('invalid-format', secret)).toThrow('Invalid encrypted data format')
    })

    it('throws error with tampered ciphertext', () => {
      const encrypted = encrypt(plaintext, secret)
      const tampered = encrypted.replace(/.$/, 'X') // Change last character
      expect(() => decrypt(tampered, secret)).toThrow()
    })
  })
})
