#!/usr/bin/env node

/**
 * Get controller address - supports both API mode and direct mode
 * Can be used from bash scripts without triggering server-only errors
 */

async function getControllerAddress() {
  try {
    // Check if we're in API mode (both OHARA_CONTROLLER_TOKEN and OHARA_API_URL are set)
    const isApiMode = !!(process.env.OHARA_CONTROLLER_TOKEN && process.env.OHARA_API_URL);
    
    if (isApiMode) {
      // API mode: fetch controller address from Ohara API
      // Make direct HTTP request to avoid server-only import issues
      const baseUrl = process.env.OHARA_API_URL;
      const token = process.env.OHARA_CONTROLLER_TOKEN;
      
      try {
        const response = await fetch(`${baseUrl}/v2/miniapp-controller/wallet`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        const address = data.data?.address;
        
        if (!address) {
          console.error('❌ No controller address returned from Ohara API');
          process.exit(1);
        }
        
        console.error('📡 Using API mode - fetched from Ohara API');
        return address;
      } catch (apiError) {
        console.error('❌ API mode error:', apiError.message);
        process.exit(1);
      }
    } else {
      // Direct mode: use local controller key
      const { getControllerAddress: getLocalAddress } = require('./controller.js');
      const address = await getLocalAddress();
      
      if (!address) {
        console.error('❌ No controller address found in local storage');
        process.exit(1);
      }
      
      console.error('🔐 Using direct mode - fetched from local storage');
      return address;
    }
  } catch (error) {
    console.error('❌ Error getting controller address:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { getControllerAddress };

// CLI usage
if (require.main === module) {
  getControllerAddress()
    .then(address => {
      console.log(address);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}
