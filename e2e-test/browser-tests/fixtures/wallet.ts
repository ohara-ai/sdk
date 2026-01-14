import { test as base, BrowserContext } from '@playwright/test'
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'

// Anvil's well-known test private keys
export const ANVIL_ACCOUNTS = {
  // Account #0 - typically used for factory deployment
  deployer: {
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const,
  },
  // Account #1 - use for testing
  user1: {
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const,
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const,
  },
  // Account #2 - use for testing
  user2: {
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const,
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as const,
  },
} as const

// Script to inject into the browser to mock window.ethereum
export function createMockEthereumScript(privateKey: string, address: string, rpcUrl: string, chainId: number) {
  return `
    (function() {
      const privateKey = '${privateKey}';
      const address = '${address}';
      const rpcUrl = '${rpcUrl}';
      const chainId = ${chainId};
      
      let connected = false;
      const listeners = {};
      
      async function sendRpcRequest(method, params) {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params: params || [],
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
      }
      
      window.ethereum = {
        isMetaMask: true,
        isConnected: () => connected,
        selectedAddress: null,
        chainId: '0x' + chainId.toString(16),
        networkVersion: chainId.toString(),
        
        on(event, callback) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(callback);
        },
        
        removeListener(event, callback) {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
          }
        },
        
        emit(event, data) {
          if (listeners[event]) {
            listeners[event].forEach(cb => cb(data));
          }
        },
        
        async request({ method, params }) {
          console.log('[MockEthereum] Request:', method, params);
          
          switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              connected = true;
              window.ethereum.selectedAddress = address;
              window.ethereum.emit('connect', { chainId: window.ethereum.chainId });
              window.ethereum.emit('accountsChanged', [address]);
              return [address];
              
            case 'eth_chainId':
              return '0x' + chainId.toString(16);
              
            case 'net_version':
              return chainId.toString();
              
            case 'wallet_switchEthereumChain':
              return null;
              
            case 'wallet_addEthereumChain':
              return null;
              
            case 'eth_getBalance':
              return await sendRpcRequest('eth_getBalance', params);
              
            case 'eth_blockNumber':
              return await sendRpcRequest('eth_blockNumber', params);
              
            case 'eth_getBlockByNumber':
              return await sendRpcRequest('eth_getBlockByNumber', params);
              
            case 'eth_call':
              return await sendRpcRequest('eth_call', params);
              
            case 'eth_estimateGas':
              return await sendRpcRequest('eth_estimateGas', params);
              
            case 'eth_gasPrice':
              return await sendRpcRequest('eth_gasPrice', params);
              
            case 'eth_getTransactionCount':
              return await sendRpcRequest('eth_getTransactionCount', params);
              
            case 'eth_sendTransaction': {
              // For transactions, we need to sign them with the private key
              // This is a simplified version - for full support use eth_sendRawTransaction
              const tx = params[0];
              
              // Get nonce if not provided
              if (!tx.nonce) {
                tx.nonce = await sendRpcRequest('eth_getTransactionCount', [address, 'pending']);
              }
              
              // Get gas price if not provided
              if (!tx.gasPrice && !tx.maxFeePerGas) {
                tx.gasPrice = await sendRpcRequest('eth_gasPrice', []);
              }
              
              // Estimate gas if not provided
              if (!tx.gas) {
                tx.gas = await sendRpcRequest('eth_estimateGas', [tx]);
              }
              
              // Use eth_sendTransaction directly with Anvil (it auto-signs for unlocked accounts)
              // For production, you'd need to sign with the private key
              return await sendRpcRequest('eth_sendTransaction', [tx]);
            }
              
            case 'eth_getTransactionReceipt':
              return await sendRpcRequest('eth_getTransactionReceipt', params);
              
            case 'eth_getTransactionByHash':
              return await sendRpcRequest('eth_getTransactionByHash', params);
              
            case 'personal_sign':
            case 'eth_sign':
              // For signing, we'd need crypto libs in browser
              // Anvil accepts any signature for unlocked accounts
              return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
              
            case 'eth_signTypedData_v4':
              return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
              
            default:
              // Forward unknown methods to RPC
              return await sendRpcRequest(method, params);
          }
        },
        
        enable() {
          return this.request({ method: 'eth_requestAccounts' });
        },
        
        send(method, params) {
          if (typeof method === 'object') {
            return this.request(method);
          }
          return this.request({ method, params });
        },
        
        sendAsync(payload, callback) {
          this.request(payload)
            .then(result => callback(null, { jsonrpc: '2.0', id: payload.id, result }))
            .catch(error => callback(error, null));
        },
      };
      
      // Announce provider
      window.dispatchEvent(new Event('ethereum#initialized'));
      console.log('[MockEthereum] Injected mock wallet for address:', address);
    })();
  `
}

// Playwright fixture that injects the mock wallet
export const test = base.extend<{
  walletContext: BrowserContext
  walletAddress: string
}>({
  walletAddress: ANVIL_ACCOUNTS.user1.address,
  
  walletContext: async ({ browser }, use) => {
    const context = await browser.newContext()
    
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
    const chainId = 31337 // Anvil
    
    // Inject mock wallet before each page
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        chainId
      )
    )
    
    await use(context)
    await context.close()
  },
})

export { expect } from '@playwright/test'
