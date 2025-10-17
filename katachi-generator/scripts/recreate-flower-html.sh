#!/bin/bash

# Recreate the old flower HTML with current optimized generator
# This old file was generated before NFT texture mapping was added

WALLET="0xee49f82e58a1c2b306720d0c68047cbf70c11fb5"
PATTERN="flower"
SEED="flower_recreated_$(date +%s)"

echo "🌸 Recreating flower pattern with optimized generator..."
echo "📍 Wallet: $WALLET"
echo "🎨 Pattern: $PATTERN"
echo "🎲 Seed: $SEED"
echo ""

# Call the generator API
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$WALLET\",
    \"pattern\": \"$PATTERN\",
    \"seed2\": \"$SEED\",
    \"images\": []
  }" | jq '.'

echo ""
echo "✅ Generation complete!"
echo "💡 The new optimized HTML will be in the temp/ directory"
echo "💡 It will have minified JS/CSS and use the current template structure"
