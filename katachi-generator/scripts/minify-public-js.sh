#!/bin/bash

# Minify public JS files with console.log removal
# Usage: ./scripts/minify-public-js.sh

cd "$(dirname "$0")/.." || exit

echo "🚀 Minifying public JavaScript files..."
echo "============================================================"
echo ""

# List of files to minify (relative to public/js/)
FILES=(
    "model.js"
    "controls.js"
    "main.js"
    "threeView.js"
    "VRInterface.js"
    "pattern.js"
    "globals.js"
    "importer.js"
    "curvedFolding.js"
    "fold.js"
    "cellColorizer.js"
    "dynamic/GPUMath.js"
)

TOTAL=0
MINIFIED=0

for file in "${FILES[@]}"; do
    SOURCE="public/js/$file"
    TARGET="public/js/${file%.js}.min.js"

    if [ ! -f "$SOURCE" ]; then
        echo "⚠️  Skipping: $file (not found)"
        continue
    fi

    ORIGINAL_SIZE=$(wc -c < "$SOURCE" | tr -d ' ')

    echo "📄 Processing: $file"

    # Minify with console.log removal
    npx terser "$SOURCE" \
        --compress drop_console=false,drop_debugger=true,pure_funcs='["console.log"]' \
        --format comments=false \
        -o "$TARGET" 2>/dev/null

    if [ $? -eq 0 ]; then
        MINIFIED_SIZE=$(wc -c < "$TARGET" | tr -d ' ')
        REDUCTION=$(awk "BEGIN {printf \"%.1f\", (1 - $MINIFIED_SIZE / $ORIGINAL_SIZE) * 100}")

        echo "  ✅ Created: ${file%.js}.min.js"
        echo "  📊 Size: $ORIGINAL_SIZE → $MINIFIED_SIZE bytes ($REDUCTION% reduction)"
        echo ""

        TOTAL=$((TOTAL + ORIGINAL_SIZE))
        MINIFIED=$((MINIFIED + MINIFIED_SIZE))
    else
        echo "  ❌ Error minifying $file"
        echo ""
    fi
done

echo "============================================================"
echo ""
echo "✨ Minification Complete!"
echo ""
echo "📊 Summary:"
echo "   Total original:  $(printf "%'d" $TOTAL) bytes"
echo "   Total minified:  $(printf "%'d" $MINIFIED) bytes"
TOTAL_REDUCTION=$(awk "BEGIN {printf \"%.1f\", (1 - $MINIFIED / $TOTAL) * 100}")
echo "   Total reduction: $TOTAL_REDUCTION%"
echo ""
