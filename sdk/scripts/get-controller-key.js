#!/usr/bin/env node

/**
 * Get controller private key - for direct mode only
 * Can be used from bash/node scripts without triggering server-only errors
 * 
 * WARNING: This returns the private key! Only use in local dev environments.
 * For production, use Ohara API mode where keys are managed securely.
 */

async function getControllerKey() {
  // Check if we're in API mode - keys are NOT available in API mode
  const isApiMode = !!(
    process.env.OHARA_CONTROLLER_TOKEN && process.env.OHARA_API_URL
  )

  if (isApiMode) {
    console.error('❌ Cannot get controller key in API mode')
    console.error('   In API mode, the controller wallet is managed by Ohara API')
    process.exit(1)
  }

  // Direct mode: use local controller key
  const { getControllerKey: getKey } = require('./controller.js')
  
  try {
    const key = await getKey()
    if (!key) {
      console.error('❌ No controller key found in local storage')
      process.exit(1)
    }
    return key
  } catch (error) {
    console.error('❌ Error getting controller key:', error.message)
    process.exit(1)
  }
}

// Export for programmatic use
module.exports = { getControllerKey }

// CLI usage
if (require.main === module) {
  getControllerKey()
    .then((key) => {
      console.log(key)
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message)
      process.exit(1)
    })
}
