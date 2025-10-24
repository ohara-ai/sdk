#!/usr/bin/env bash

# Deploy all contracts to the local Anvil node
# Deploys DEVWORLD token, GameMatchFactory, and GameScoreFactory

set -e

RPC_URL="${RPC_URL:-http://localhost:8545}"

echo "🚀 Deploying contracts..."
echo "   RPC URL: $RPC_URL"
echo ""

# Deploy DEVWORLD token (for testing ERC20 features)
echo "📦 Deploying DEVWORLD token..."
forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy GameMatchFactory
echo "🏭 Deploying GameMatchFactory..."
forge script contracts/script/DeployGameMatchFactory.s.sol:DeployGameMatchFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy GameScoreFactory
echo "🏭 Deploying GameScoreFactory..."
forge script contracts/script/DeployGameScoreFactory.s.sol:DeployGameScoreFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""
echo "✅ All contracts deployed successfully!"
echo "   Update .env.local with the deployed addresses"
