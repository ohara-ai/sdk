#!/usr/bin/env bash

# Fund the Ohara AI controller account on local Anvil
# This script reads the controller address from ohara-ai-data/keys.json
# and sends 10 ETH from Anvil's default account

set -e

KEYS_FILE="ohara-ai-data/keys.json"

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

# Check if keys file exists
if [ ! -f "$KEYS_FILE" ]; then
  echo "❌ Keys file not found at $KEYS_FILE"
  echo "   Start the app first to generate a controller key"
  exit 1
fi

# Extract controller private key from keys.json using node
CONTROLLER_KEY=$(node -e "console.log(require('./$KEYS_FILE').controller)")

if [ -z "$CONTROLLER_KEY" ] || [ "$CONTROLLER_KEY" = "null" ] || [ "$CONTROLLER_KEY" = "undefined" ]; then
  echo "❌ Controller key not found in $KEYS_FILE"
  exit 1
fi

# Derive controller address from private key
echo "🔑 Deriving controller address..."
CONTROLLER_ADDRESS=$(cast wallet address "$CONTROLLER_KEY")

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
