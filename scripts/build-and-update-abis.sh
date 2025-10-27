#!/bin/bash

# Build contracts and update ABIs in one command
set -e

echo "🔨 Building contracts..."
cd contracts
forge build
cd ..

echo ""
echo "📦 Updating ABIs..."
npm run update-abis

echo ""
echo "✅ All done!"
