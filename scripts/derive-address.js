#!/usr/bin/env node

/**
 * Utility script to derive Ethereum addresses from private keys
 * Usage: node scripts/derive-address.js <private_key>
 * 
 * Example with Anvil default keys:
 * node scripts/derive-address.js 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 * node scripts/derive-address.js 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
 */

const { createPublicClient, http, parseAccount } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const privateKey = process.argv[2];

if (!privateKey) {
  console.error('Error: Please provide a private key as an argument');
  console.error('Usage: node scripts/derive-address.js <private_key>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/derive-address.js 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  process.exit(1);
}

try {
  const account = privateKeyToAccount(privateKey);
  console.log('Address:', account.address);
} catch (error) {
  console.error('Error deriving address:', error.message);
  process.exit(1);
}
