#!/bin/bash

# Recreate the old flower HTML with current optimized generator
# This old file was generated before NFT texture mapping was added

WALLET="0xee49f82e58a1c2b306720d0c68047cbf70c11fb5"
PATTERN="flower"
SEED="flower_recreated_$(date +%s)"
OUTPUT_FILE="$(dirname "$0")/../temp/html/kg_flower_recreated_$(date +%s).html"

echo "🌸 Recreating flower pattern with optimized generator..."
echo "📍 Wallet: $WALLET"
echo "🎨 Pattern: $PATTERN"
echo "🎲 Seed: $SEED"
echo "📄 Output: $OUTPUT_FILE"
echo ""

# Call the generator API and save response (katachi-generator runs on port 3001)
RESPONSE=$(curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$WALLET\",
    \"pattern\": \"$PATTERN\",
    \"seed2\": \"$SEED\",
    \"images\": []
  }" 2>/dev/null)

# Check if response is JSON (error) or HTML (success)
if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
  # It's JSON - likely an error or metadata response
  echo "📊 API Response:"
  echo "$RESPONSE" | jq '.'

  # Check if it contains htmlUrl
  HTML_URL=$(echo "$RESPONSE" | jq -r '.htmlUrl // .previewHtmlUrl // empty' 2>/dev/null)
  if [ -n "$HTML_URL" ]; then
    echo ""
    echo "📥 Downloading HTML from: $HTML_URL"
    curl -s "$HTML_URL" -o "$OUTPUT_FILE"

    if [ -f "$OUTPUT_FILE" ]; then
      FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
      echo "✅ Saved to: $OUTPUT_FILE ($FILE_SIZE)"
    fi
  fi
else
  # It's HTML - save it directly
  echo "$RESPONSE" > "$OUTPUT_FILE"

  if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo "✅ HTML saved to: $OUTPUT_FILE ($FILE_SIZE)"
  else
    echo "❌ Failed to save HTML"
    exit 1
  fi
fi

echo ""
echo "🎉 Generation complete!"
echo "📂 Check: $(dirname "$OUTPUT_FILE")"
