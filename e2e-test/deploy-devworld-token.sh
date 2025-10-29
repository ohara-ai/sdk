#!/bin/bash

# Deploy DevWorldToken contract for e2e testing
# This is a demo ERC20 token used for testing game features

set -e

# Load environment variables
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
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

echo "🪙 Deploying DEVWORLD Token..."
echo "Using RPC: $RPC_URL"

cd "$(dirname "$0")"

forge script contracts/script/DeployDevWorldToken.s.sol:DeployDevWorldToken \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --legacy

echo ""
echo "✅ DEVWORLD Token deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy the deployed address from above"
echo "   2. Add it to your .env file as NEXT_PUBLIC_DEVWORLD_TOKEN=<address>"
echo "   3. Use it in your e2e tests and UI"
