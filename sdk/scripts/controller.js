// This file provides script-friendly access to controller functionality
// It bypasses the 'server-only' restriction for Node.js scripts
const path = require('path')
const fs = require('fs/promises')
const { privateKeyToAccount } = require('viem/accounts')

const STORAGE_DIR = path.join(process.cwd(), 'ohara-ai-data')
const KEYS_PATH = path.join(STORAGE_DIR, 'keys.json')

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
    const key = keys.controller

    if (key) return key

    // Generate a new random private key if none exists
    const nodeCrypto = require('crypto')
    const randomBytes = nodeCrypto.randomBytes(32)
    const newPrivateKey = '0x' + randomBytes.toString('hex')

    // Save the new key
    keys.controller = newPrivateKey
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
