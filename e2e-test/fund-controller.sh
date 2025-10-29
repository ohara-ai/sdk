#!/usr/bin/env bash

# Fund the Ohara AI controller account on local Anvil
# This script reads the controller address from ohara-ai-data/keys.json
# and sends 10 ETH from Anvil's default account

set -e

KEYS_FILE="ohara-ai-data/keys.json"
RPC_URL="${RPC_URL:-http://localhost:8545}"
ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

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
  --private-key "$ANVIL_PRIVATE_KEY" \
  --rpc-url "$RPC_URL"

# Check balance
BALANCE=$(cast balance "$CONTROLLER_ADDRESS" --rpc-url "$RPC_URL")
BALANCE_ETH=$(cast to-unit "$BALANCE" ether)

echo "✅ Controller funded successfully!"
echo "   Balance: $BALANCE_ETH ETH"
