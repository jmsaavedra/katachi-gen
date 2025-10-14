# Build Process Analysis

## Current Build Output

```
npm run build
  → node build-ejs.js
  → webpack --mode production

Results:
  ✅ public/generated-index.html (1.8MB)
  ✅ dist/template.html (duplicate, from build-ejs.js)
  ✅ dist/bundle.js (28.6 KiB) - webpack output
```

## Issues Identified

### 1. **LEGACY: Webpack is Not Actually Used** ❌

The webpack build runs but **its output is NOT used** by the server:

- **config.js:6** → `templateHTML = 'template.html'`
- **Thumbnail generation** uses the EJS-compiled HTML from server, NOT webpack output
- **src/index.js** contains a complete fallback loader that's NEVER executed

**Evidence**:
```javascript
// handlers/pattern.js uses EJS-generated templates
const htmlContent = await generateNFTTemplate(processedData);
// This uses utils/templateGenerator.js which uses src/template/*.ejs

// NOT dist/bundle.js or webpack output!
```

### 2. **Duplicate HTML Generation**

`build-ejs.js` writes the same file twice:
- Line 36: `public/generated-index.html`
- Line 48: `dist/template.html`

The second write (dist/template.html) is never used because:
- The server generates fresh HTML for each NFT via `generateNFTTemplate()`
- Puppeteer loads the dynamically generated HTML files from `temp/html/`

### 3. **What Webpack Actually Does**

Webpack bundles:
- `src/index.js` → JavaScript loader/initialization code
- `src/main.css` → Basic styles
- Output: `dist/bundle.js` (28.6 KiB)

But this bundle is **never referenced or included** in the final HTML templates.

### 4. **What's Actually Used in Production**

The real HTML generation flow:
```
Client Request
  ↓
handlers/pattern.js
  ↓
utils/templateGenerator.js
  ↓
src/template/index.ejs (EJS templates)
  → Renders complete HTML with:
    - Inline JavaScript from partials/scripts/*.ejs
    - Inline CSS from public/css/*.css
    - NFT data injected directly
  ↓
temp/html/kg_*.html (unique per NFT)
  ↓
Puppeteer screenshot
```

**No webpack involvement at all.**

## What Should Be Kept vs Removed

### ✅ KEEP (Actually Used)

1. **build-ejs.js** - Used for validation/testing
   - Generates `public/generated-index.html` for manual testing
   - Useful for debugging EJS templates
   - Should be kept but simplified

2. **src/template/** - The actual production templates
   - All `.ejs` files are used by the server
   - This is the real template system

3. **utils/templateGenerator.js** - Core template engine
   - Used by every NFT generation request
   - This is production code

### ❌ REMOVE or ARCHIVE (Legacy/Unused)

1. **webpack.config.js** - Completely unused
   - The 28.6 KiB bundle.js is never loaded
   - Can be removed or archived

2. **src/index.js** - Never executed
   - Contains fallback loader that never runs
   - Can be removed or archived

3. **src/main.css** - Partially legacy
   - If used, it should be in `public/css/` instead
   - Check if it duplicates content from `public/css/main.css`

4. **dist/template.html** duplicate write in build-ejs.js
   - Line 48 can be removed
   - Only `public/generated-index.html` is needed for testing

### ⚠️ CLARIFY

1. **rollup.config.js** - Is this used anywhere?
   - There's a rollup:build script in package.json
   - Needs investigation

## Recommended Actions

### Option A: Clean Removal (Recommended)
Remove webpack entirely since it's not used:

```bash
# Remove webpack and related dependencies
npm uninstall webpack webpack-cli webpack-dev-server \
  babel-loader @babel/core @babel/preset-env \
  style-loader css-loader \
  html-webpack-plugin html-bundler-webpack-plugin

# Remove files
rm webpack.config.js
rm src/index.js
rm -rf dist/bundle.js*

# Update build-ejs.js (remove dist/template.html write)
# Update package.json scripts
```

**Updated package.json scripts**:
```json
{
  "scripts": {
    "start": "NODE_ENV=development node server.js",
    "start:prod": "NODE_ENV=production node server.js",
    "build": "node build-ejs.js",
    "dev": "NODE_ENV=development node server.js"
  }
}
```

### Option B: Keep for Future Use
If you plan to use webpack for client-side bundling later:
- Add clear documentation about what it's for
- Ensure it's actually integrated into the templates
- Don't run it in the build process until it's actually used

## Summary

**Current State**: The build runs webpack but produces output that's never used. The actual production system uses EJS templates compiled on-demand by the server.

**Problem**: Confusing build process that suggests webpack is important when it's completely bypassed.

**Solution**: Either remove webpack entirely (Option A) or clearly document that it's experimental/future work.

## Files to Check Before Removal

```bash
# Search for references to webpack output
grep -r "bundle.js" katachi-generator/
grep -r "dist/" katachi-generator/ --exclude-dir=node_modules

# Search for imports from src/index.js
grep -r "src/index" katachi-generator/ --exclude-dir=node_modules
```

If these searches come up empty (except for webpack.config.js itself), it's safe to remove.
