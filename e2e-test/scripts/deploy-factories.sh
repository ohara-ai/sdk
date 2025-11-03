#!/usr/bin/env bash

# Deploy factory contracts to the network
# Deploys game.MatchFactory and game.ScoreFactory

set -e

# Load environment variables
if [ -f ./.env ]; then
  export $(cat ./.env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found in root directory"
  exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY not set in .env file"
  exit 1
fi

# Check if RPC_URL is set
if [ -z "$RPC_URL" ]; then
  echo "Error: RPC_URL not set in .env file"
  exit 1
fi

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