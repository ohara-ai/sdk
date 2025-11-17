#!/usr/bin/env bash

# Fund the Ohara AI controller account on local Anvil
# This script gets the controller key using the SDK's getControllerKey method
# which will generate and store a new key if one doesn't exist.
# Then it sends 10 ETH from Anvil's default account to the controller.

set -e

# Load environment variables
if [ -f ./.env ]; then
  export $(grep -v '^#' .env | xargs)
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

# Get controller address - checks for API mode first, falls back to local SDK
echo "🔑 Getting controller address..."
CONTROLLER_ADDRESS=$(node ../sdk/scripts/get-controller-address.js)

echo "📍 Controller address: $CONTROLLER_ADDRESS"
echo "💰 Sending 10 ETH from Anvil default account..."

# Send ETH to controller
cast send "$CONTROLLER_ADDRESS" \
  --value 10ether \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC_URL"

# Check balance
BALANCE=$(cast balance "$CONTROLLER_ADDRESS" --rpc-url "$RPC_URL")
BALANCE_ETH=$(cast to-unit "$BALANCE" ether)

echo "✅ Controller funded successfully!"
echo "   Balance: $BALANCE_ETH ETH"
