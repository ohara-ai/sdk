#!/usr/bin/env bash

# Deploy factory contracts to the network
# Deploys GameMatchFactory and GameScoreFactory
# Note: Use npm run deploy-devworld-token to deploy the demo ERC20 token

set -e

RPC_URL="${RPC_URL:-http://localhost:8545}"

echo "🚀 Deploying factory contracts..."
echo "   RPC URL: $RPC_URL"
echo ""

# Deploy GameMatchFactory
echo "🏭 Deploying GameMatchFactory..."
forge script ../contracts/script/DeployGameMatchFactory.s.sol:DeployGameMatchFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy GameScoreFactory
echo "🏭 Deploying GameScoreFactory..."
forge script ../contracts/script/DeployGameScoreFactory.s.sol:DeployGameScoreFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""
echo "✅ Factory contracts deployed successfully!"
echo "   Update .env.local with the deployed addresses"
echo ""
echo "💡 Tip: Run 'npm run deploy-devworld-token' to deploy the demo ERC20 token"
