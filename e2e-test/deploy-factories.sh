#!/usr/bin/env bash

# Deploy factory contracts to the network
# Deploys game.MatchFactory and game.ScoreFactory
# Note: Use npm run deploy-devworld-token to deploy the demo ERC20 token

set -e

RPC_URL="${RPC_URL:-http://localhost:8545}"

echo "🚀 Deploying factory contracts..."
echo "   RPC URL: $RPC_URL"
echo ""

# Deploy game.MatchFactory
echo "🏭 Deploying game.MatchFactory..."
forge script ../contracts/script/game/DeployMatchFactory.s.sol:DeployMatchFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.ScoreFactory
echo "🏭 Deploying game.ScoreFactory..."
forge script ../contracts/script/game/DeployScoreFactory.s.sol:DeployScoreFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""
echo "✅ Factory contracts deployed successfully!"
echo "   Update .env.local with the deployed addresses"
echo ""
echo "💡 Tip: Run 'npm run deploy-devworld-token' to deploy the demo ERC20 token"
