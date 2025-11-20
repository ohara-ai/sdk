# Factory Deployment Guide

This guide explains how to deploy the Ohara AI factory contracts to Base networks.

## Prerequisites

1. **Foundry installed** - Required for running deployment scripts

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment variables configured** - Copy `.env.dev` to `.env` and fill in:
   - `PRIVATE_KEY` - Private key of the deployer wallet (must have ETH for gas)
   - `BASE_SEPOLIA_RPC_URL` - RPC endpoint for Base Sepolia testnet
   - `BASE_MAINNET_RPC_URL` - RPC endpoint for Base Mainnet
   - Note: Contracts are verified using Blockscout (no API key required)

3. **Funded wallet** - Ensure your deployer wallet has sufficient ETH:
   - **Base Sepolia**: Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - **Base Mainnet**: Ensure you have real ETH for deployment

## Deployment Commands

### Deploy to Base Sepolia (Testnet)

Default deployment to testnet:

```bash
./scripts/deploy-factories.sh
```

Or explicitly specify the network:

```bash
./scripts/deploy-factories.sh base-sepolia
```

### Deploy to Base Mainnet (Production)

⚠️ **WARNING**: This deploys to production and uses real funds!

```bash
./scripts/deploy-factories.sh base-mainnet
```

You will be prompted to confirm before deployment proceeds.

## What Gets Deployed

The script deploys two factory contracts:

1. **MatchFactory** - Factory for creating game match contracts
2. **ScoreFactory** - Factory for creating score tracking contracts

## After Deployment

1. **Save the contract addresses** - The deployment output will show the deployed addresses:

   ```
   MatchFactory deployed at: 0x...
   ScoreFactory deployed at: 0x...
   ```

2. **Update your environment** - Add the deployed addresses to your `.env` file:

   ```bash
   MATCH_FACTORY_ADDRESS=0x...
   SCORE_FACTORY_ADDRESS=0x...
   ```

3. **Verify contracts** (if auto-verification failed):
   ```bash
   forge verify-contract <ADDRESS> <CONTRACT_NAME> --chain <CHAIN_ID> --verifier blockscout --verifier-url <VERIFIER_URL> --watch
   ```

   - Base Sepolia: Chain ID `84532`, Verifier URL `https://base-sepolia.blockscout.com/api`
   - Base Mainnet: Chain ID `8453`, Verifier URL `https://base.blockscout.com/api`

## Network Information

### Base Sepolia (Testnet)

- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Block Explorer**: https://sepolia.basescan.org (or https://base-sepolia.blockscout.com)
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Base Mainnet (Production)

- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org (or https://base.blockscout.com)

## Troubleshooting

### "PRIVATE_KEY not set"

Ensure your `.env` file exists and contains a valid `PRIVATE_KEY` entry.

### "RPC URL not set"

Add the appropriate RPC URL to your `.env` file:

- `BASE_SEPOLIA_RPC_URL` for testnet
- `BASE_MAINNET_RPC_URL` for mainnet

### "Insufficient funds"

Your deployer wallet needs ETH to pay for gas fees. Get testnet ETH from the faucet or transfer mainnet ETH to your wallet.

### Verification failed

If automatic verification fails, you can manually verify:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain <CHAIN_ID> \
  --verifier blockscout \
  --verifier-url <VERIFIER_URL> \
  --watch
```

Blockscout is used for verification and does not require API keys.

## Security Best Practices

1. **Never commit your `.env` file** - It contains sensitive private keys
2. **Use a dedicated deployment wallet** - Don't use your main wallet for deployments
3. **Test on Sepolia first** - Always test deployments on testnet before mainnet
4. **Verify contract source code** - Ensure contracts are verified on Basescan for transparency
5. **Double-check addresses** - Verify deployed addresses before using them in production

## Script Details

The deployment script (`deploy-factories.sh`):

- Validates network parameter (base-sepolia or base-mainnet)
- Loads environment variables from `.env`
- Prevents using the default Anvil development private key
- Performs safety checks (especially for mainnet)
- Deploys MatchFactory and ScoreFactory sequentially
- Automatically verifies contracts on Blockscout (no API key required)
- Uses `--legacy` flag for compatibility with Base network

## Support

For issues or questions:

- Check the [Foundry documentation](https://book.getfoundry.sh/)
- Review [Base documentation](https://docs.base.org/)
- Open an issue in the project repository
