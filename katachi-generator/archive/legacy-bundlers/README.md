# Legacy Bundler Files (Archived)

These files were part of an experimental webpack/rollup build system that was never integrated into production.

## Why These Were Archived

The production system uses **server-side EJS template rendering** (via `utils/templateGenerator.js`) to generate HTML on-demand for each NFT. The webpack/rollup bundles were generated but never actually loaded or used.

## Files Archived

- `webpack.config.js` - Webpack 5 configuration
- `webpack.config.old.js` - Older webpack config
- `webpack.config.js.backup` - Backup of webpack config
- `rollup.config.js` - Rollup configuration
- `src/index.js` - JavaScript entry point for webpack (never used)
- `src/main.css` - CSS file (duplicate of public/css/main.css)

## If You Need to Restore

If you want to experiment with client-side bundling again:

1. Copy the relevant config file back to the root
2. Restore `src/index.js` and `src/main.css`
3. Integrate the bundle into the EJS templates (`src/template/partials/scripts/three-setup.ejs`)
4. Update package.json scripts

## Current Production Flow

```
Client Request
  ↓
handlers/pattern.js
  ↓
utils/templateGenerator.js (EJS rendering)
  ↓
src/template/index.ejs
  ↓
temp/html/kg_*.html (unique per NFT)
  ↓
Puppeteer screenshot
```

See BUILD-ANALYSIS.md in the root for full details.
