#!/usr/bin/env node

/**
 * Get contract addresses - supports both API mode and direct mode
 * Can be used from bash scripts without triggering server-only errors
 * 
 * Usage:
 *   node get-contracts.js              # Returns all contracts as JSON
 *   node get-contracts.js Match        # Returns just the Match contract address
 *   node get-contracts.js Heap         # Returns just the Heap contract address
 */

const fs = require('fs')
const path = require('path')

/**
 * Get storage directory - mirrors SDK's oharaConfig.getStorageDir()
 */
function getStorageDir() {
  if (process.env.OHARA_STORAGE_DIR) {
    return process.env.OHARA_STORAGE_DIR
  }
  return path.join(process.cwd(), 'public', 'ohara-ai-data')
}

/**
 * Read contracts from local storage
 */
function readLocalContracts(chainId) {
  const contractsPath = path.join(getStorageDir(), 'contracts.json')
  
  try {
    const content = fs.readFileSync(contractsPath, 'utf-8')
    const storage = JSON.parse(content)
    return storage[chainId.toString()] || {}
  } catch (error) {
    return {}
  }
}

/**
 * Read contracts from API cache
 */
function readApiCache(chainId) {
  const cachePath = path.join(getStorageDir(), 'api-cache.json')
  
  try {
    const content = fs.readFileSync(cachePath, 'utf-8')
    const cache = JSON.parse(content)
    return cache[chainId.toString()] || null
  } catch (error) {
    return null
  }
}

/**
 * Convert API cache format to flat contract addresses
 */
function convertCacheToAddresses(cache) {
  const addresses = {}
  
  for (const [contractType, contract] of Object.entries(cache)) {
    if (contract && contract.address) {
      addresses[contractType] = contract.address
    }
  }
  
  return addresses
}

/**
 * Flatten nested contract structure to simple key-value
 */
function flattenContracts(contracts) {
  const flat = {}
  
  // Flatten game contracts
  if (contracts.game) {
    for (const [key, value] of Object.entries(contracts.game)) {
      // Capitalize first letter for consistency (match -> Match)
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
      flat[capitalizedKey] = value
    }
  }
  
  // Flatten ohara contracts
  if (contracts.ohara) {
    for (const [key, value] of Object.entries(contracts.ohara)) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
      flat[capitalizedKey] = value
    }
  }
  
  // Flatten app contracts
  if (contracts.app) {
    for (const [key, value] of Object.entries(contracts.app)) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
      flat[capitalizedKey] = value
    }
  }
  
  return flat
}

async function getContracts() {
  const chainId = process.env.NEXT_PUBLIC_SDK_CHAIN_ID || '31337'
  
  // Check if we're in API mode
  const isApiMode = !!(
    process.env.OHARA_CONTROLLER_TOKEN && process.env.OHARA_API_URL
  )

  if (isApiMode) {
    // API mode: try to fetch from Ohara API first
    const baseUrl = process.env.OHARA_API_URL
    const token = process.env.OHARA_CONTROLLER_TOKEN

    try {
      const response = await fetch(`${baseUrl}/v2/miniapp-controller/contracts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const contracts = data.data || []
        
        // Filter by chainId and get newest of each type
        const contractsByType = {}
        for (const contract of contracts) {
          if (contract.chainId === parseInt(chainId)) {
            if (!contractsByType[contract.contractType] || 
                new Date(contract.createdAt) > new Date(contractsByType[contract.contractType].createdAt)) {
              contractsByType[contract.contractType] = contract
            }
          }
        }
        
        // Convert to simple address map
        const addresses = {}
        for (const [type, contract] of Object.entries(contractsByType)) {
          addresses[type] = contract.address
        }
        
        console.error('📡 Using API mode - fetched from Ohara API')
        return addresses
      }
    } catch (apiError) {
      console.error('API fetch failed, falling back to cache:', apiError.message)
    }
    
    // Fall back to API cache
    const cache = readApiCache(chainId)
    if (cache) {
      console.error('📦 Using API cache')
      return convertCacheToAddresses(cache)
    }
  }

  // Direct mode: use local storage
  const localContracts = readLocalContracts(chainId)
  const flattened = flattenContracts(localContracts)
  
  console.error('🔐 Using direct mode - fetched from local storage')
  return flattened
}

// Export for programmatic use
module.exports = { getContracts }

// CLI usage
if (require.main === module) {
  const contractType = process.argv[2] // Optional: specific contract type to get

  getContracts()
    .then((contracts) => {
      if (contractType) {
        // Return specific contract address
        const address = contracts[contractType]
        if (address) {
          console.log(address)
        } else {
          console.error(`❌ Contract '${contractType}' not found`)
          console.error(`   Available: ${Object.keys(contracts).join(', ') || 'none'}`)
          process.exit(1)
        }
      } else {
        // Return all contracts as JSON
        console.log(JSON.stringify(contracts, null, 2))
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message)
      process.exit(1)
    })
}
