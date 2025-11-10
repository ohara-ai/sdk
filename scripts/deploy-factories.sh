#!/usr/bin/env bash

# Deploy factory contracts to Base networks
# Deploys game.MatchFactory and game.ScoreFactory
# 
# Usage:
#   ./scripts/deploy-factories.sh                    # Deploy to base-sepolia (default)
#   ./scripts/deploy-factories.sh base-sepolia       # Deploy to base-sepolia
#   ./scripts/deploy-factories.sh base-mainnet       # Deploy to base-mainnet

set -e

# Default network
NETWORK="${1:-base-sepolia}"

# Validate network parameter
if [[ "$NETWORK" != "base-sepolia" && "$NETWORK" != "base-mainnet" ]]; then
  echo "❌ Error: Invalid network '$NETWORK'"
  echo "   Valid options: base-sepolia, base-mainnet"
  exit 1
fi

# Load environment variables
if [ -f ./.env ]; then
  export $(cat ./.env | grep -v '^#' | xargs)
else
  echo "❌ Error: .env file not found in root directory"
  echo "   Please create a .env file with PRIVATE_KEY and RPC URLs"
  exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: PRIVATE_KEY not set in .env file"
  exit 1
fi

# Prevent using default Anvil development private key on public networks
ANVIL_DEFAULT_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
if [ "$PRIVATE_KEY" = "$ANVIL_DEFAULT_KEY" ]; then
  echo "❌ Error: Cannot use default Anvil development private key for deployment!"
  echo "   This is a well-known private key (Anvil account #0) and should NEVER be used on public networks."
  echo "   Please set a secure private key in your .env file."
  exit 1
fi

# Set RPC URL based on network
if [ "$NETWORK" = "base-sepolia" ]; then
  RPC_URL="${BASE_SEPOLIA_RPC_URL}"
  CHAIN_ID=84532
  VERIFIER_URL="https://base-sepolia.blockscout.com/api"
elif [ "$NETWORK" = "base-mainnet" ]; then
  RPC_URL="${BASE_MAINNET_RPC_URL}"
  CHAIN_ID=8453
  VERIFIER_URL="https://base.blockscout.com/api"
fi

# Check if RPC_URL is set
if [ -z "$RPC_URL" ]; then
  echo "❌ Error: RPC URL not set for $NETWORK"
  if [ "$NETWORK" = "base-sepolia" ]; then
    echo "   Please set BASE_SEPOLIA_RPC_URL in .env file"
  else
    echo "   Please set BASE_MAINNET_RPC_URL in .env file"
  fi
  exit 1
fi

# Safety check for mainnet deployment
if [ "$NETWORK" = "base-mainnet" ]; then
  echo "⚠️  WARNING: You are about to deploy to BASE MAINNET!"
  echo "   This will use real funds and deploy to production."
  echo ""
  read -p "   Are you sure you want to continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
  fi
fi

echo "🚀 Deploying factory contracts to $NETWORK..."
echo "   Network: $NETWORK"
echo "   Chain ID: $CHAIN_ID"
echo "   RPC URL: $RPC_URL"
echo ""

# Prepare forge script arguments
# Note: Verification is done separately after deployment to allow time for indexing
# Use longer timeout for mainnet (default is 45s, we use 300s = 5 minutes)
FORGE_ARGS="--rpc-url $RPC_URL --broadcast --timeout 300"
echo "   ⚠️  Contracts will be deployed without automatic verification"
echo "   💡 You can verify manually after deployment (see output for instructions)"

echo ""

# Deploy game.MatchFactory
echo "🏭 Deploying game.MatchFactory..."
echo "   (This may take a few minutes on mainnet...)"
forge script contracts/script/game/DeployMatchFactory.s.sol:DeployMatchFactory \
  $FORGE_ARGS --skip-simulation 2>&1 | tee /tmp/match_deploy.log
MATCH_EXIT_CODE=${PIPESTATUS[0]}

# Parse MatchFactory address from deployment output
MATCH_FACTORY_ADDRESS=$(grep "MatchFactory deployed at:" /tmp/match_deploy.log | awk '{print $4}')

if [ $MATCH_EXIT_CODE -ne 0 ]; then
  echo "❌ Error: MatchFactory deployment failed"
  exit 1
fi

echo ""
echo "⏳ Waiting 60 seconds before deploying ScoreFactory..."
echo "   (Allowing time for MatchFactory transaction to be confirmed)"
sleep 60
echo ""

# Deploy game.ScoreFactory
echo "🏭 Deploying game.ScoreFactory..."
echo "   (This may take a few minutes on mainnet...)"
forge script contracts/script/game/DeployScoreFactory.s.sol:DeployScoreFactory \
  $FORGE_ARGS --skip-simulation 2>&1 | tee /tmp/score_deploy.log
SCORE_EXIT_CODE=${PIPESTATUS[0]}

# Parse ScoreFactory address from deployment output
SCORE_FACTORY_ADDRESS=$(grep "ScoreFactory deployed at:" /tmp/score_deploy.log | awk '{print $4}')

if [ $SCORE_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Error: ScoreFactory deployment failed with exit code $SCORE_EXIT_CODE"
  echo "   Check the output above for details"
  echo "   Broadcast data saved to: broadcast/DeployScoreFactory.s.sol/$CHAIN_ID/run-latest.json"
  exit 1
fi

# Cleanup temp files
rm -f /tmp/match_deploy.log /tmp/score_deploy.log

echo ""
echo "✅ Factory contracts deployed successfully to $NETWORK!"
echo ""
echo "📋 Deployed Addresses:"
echo "   MatchFactory: $MATCH_FACTORY_ADDRESS"
echo "   ScoreFactory: $SCORE_FACTORY_ADDRESS"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file with the deployed addresses above"
echo "   2. Wait 1-2 minutes for Blockscout to index the contracts"
echo "   3. Run the verification commands below"
echo ""
echo "🔍 Verification Commands:"
echo "   Note: once the contracts are verified, same source code deploys will not be verified again"
echo ""
if [ -n "$MATCH_FACTORY_ADDRESS" ]; then
  echo "forge verify-contract $MATCH_FACTORY_ADDRESS \\"
  echo "  contracts/src/factories/game/MatchFactory.sol:MatchFactory \\"
  echo "  --chain $CHAIN_ID \\"
  echo "  --verifier blockscout \\"
  echo "  --verifier-url $VERIFIER_URL"
  echo ""
fi

if [ -n "$SCORE_FACTORY_ADDRESS" ]; then
  echo "forge verify-contract $SCORE_FACTORY_ADDRESS \\"
  echo "  contracts/src/factories/game/ScoreFactory.sol:ScoreFactory \\"
  echo "  --chain $CHAIN_ID \\"
  echo "  --verifier blockscout \\"
  echo "  --verifier-url $VERIFIER_URL"
  echo ""
fi
