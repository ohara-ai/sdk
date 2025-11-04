// This file provides script-friendly access to controller functionality
const { getControllerKey } = require('../dist/storage/contractStorage');
const { privateKeyToAccount } = require('viem/accounts');

async function getControllerAddress() {
  const privateKey = await getControllerKey();
  if (!privateKey) {
    throw new Error('No controller key found');
  }
  const account = privateKeyToAccount(privateKey);
  return account.address;
}

// Export for CommonJS
module.exports = {
  getControllerAddress
};
