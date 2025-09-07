# Troubleshooting Guide

## Overview

This guide covers common issues that may arise during development with the modularized HTML template system, along with solutions and rollback procedures.

## Common Build Issues

### 1. EJS Template Compilation Errors

#### **Symptom:**
```
Error: Could not locate the bindings file
Template compilation failed: Missing partial 'partials/head'
```

#### **Possible Causes:**
- Missing or incorrectly named partial files
- Incorrect include paths in templates
- EJS syntax errors in partials

#### **Solutions:**

1. **Verify File Structure:**
   ```bash
   ls -la src/template/partials/
   # Ensure all required partials exist:
   # - head.ejs
   # - body-content.ejs
   # - patterns/index.ejs
   # - scripts/three-setup.ejs, etc.
   ```

2. **Check Include Syntax:**
   ```html
   <!-- Correct include syntax -->
   <%- include('partials/head') %>
   
   <!-- Incorrect (missing quotes or wrong path) -->
   <%- include(partials/head) %>
   <%- include('partial/head') %>
   ```

3. **Validate EJS Syntax:**
   ```bash
   # Test template syntax
   npx ejs-cli src/template/index.ejs --output-file test.html
   ```

#### **Quick Fix:**
```bash
# Restore from backup if available
cp webpack.config.js.backup webpack.config.js
npm run build
```

### 2. Webpack Configuration Issues

#### **Symptom:**
```
Module not found: Error: Can't resolve './src/template/index.ejs'
HtmlBundlerPlugin is not a constructor
```

#### **Solutions:**

1. **Verify Plugin Installation:**
   ```bash
   npm list html-bundler-webpack-plugin
   # If missing:
   npm install --save-dev html-bundler-webpack-plugin
   ```

2. **Check Webpack Config:**
   ```javascript
   // Ensure correct plugin import
   const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
   
   // Verify entry configuration
   entry: {
     'template': './src/template/index.ejs'
   }
   ```

3. **Reset Configuration:**
   ```bash
   # Restore from known working backup
   git checkout HEAD -- webpack.config.js
   npm install
   npm run build
   ```

### 3. Asset Inlining Problems

#### **Symptom:**
```
ERROR in ./src/template/partials/patterns/airplane.ejs
Module parse failed: Unexpected token
```

#### **Solutions:**

1. **Check Asset Paths:**
   ```html
   <!-- Ensure proper asset referencing -->
   <script src="js/three.min.js" inline></script>
   
   <!-- Not this -->
   <script src="./js/three.min.js"></script>
   ```

2. **Verify Raw Loader Configuration:**
   ```javascript
   // In webpack.config.js
   {
     test: /\.svg$/,
     use: 'raw-loader',
   }
   ```

3. **Clear Build Cache:**
   ```bash
   rm -rf dist/
   rm -rf node_modules/.cache/
   npm run build
   ```

### 4. Pattern Loading Failures

#### **Symptom:**
- Origami patterns not appearing in generated template
- JavaScript error: "origamiPatterns is not defined"
- Empty pattern array in browser console

#### **Solutions:**

1. **Verify Pattern Index:**
   ```bash
   # Check pattern index includes all patterns
   cat src/template/partials/patterns/index.ejs
   ```

2. **Validate Pattern Format:**
   ```javascript
   // Each pattern file should export correctly
   const patternNamePattern = {
       maxFolding: 95,
       name: "pattern.svg",
       patternType: "PatternName",
       svgContent: `<svg>...</svg>`
   };
   ```

3. **Test Pattern Loading:**
   ```bash
   # Build and check output
   npm run build
   grep -A 5 "origamiPatterns" dist/template.html
   ```

## Development Server Issues

### 1. Hot Reload Not Working

#### **Solutions:**

1. **Check Development Server:**
   ```bash
   # Restart development server
   npm run serve
   
   # Verify port availability
   lsof -ti:9000
   ```

2. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Chrome/Firefox)
   - Clear cache and hard reload
   - Try incognito/private window

3. **Verify File Watching:**
   ```bash
   # Check if files are being watched
   # Look for "webpack compiled" messages in console
   ```

### 2. Build Performance Issues

#### **Symptom:**
- Very slow build times (>30 seconds)
- High memory usage during builds

#### **Solutions:**

1. **Optimize Build Configuration:**
   ```javascript
   // In webpack.config.js
   optimization: {
     splitChunks: false,
     minimizer: [], // Disable for development
   }
   ```

2. **Clear Node Modules:**
   ```bash
   rm -rf node_modules/
   rm package-lock.json
   npm install
   ```

3. **Check System Resources:**
   ```bash
   # Monitor memory and CPU usage
   top -p $(pgrep node)
   ```

## Runtime Issues

### 1. Three.js Initialization Failures

#### **Symptom:**
- Canvas not appearing
- JavaScript errors related to THREE object
- WebGL context errors

#### **Solutions:**

1. **Check Library Loading Order:**
   ```html
   <!-- Ensure proper order in scripts/three-setup.ejs -->
   <script src="js/three.min.js"></script>
   <script src="js/TrackballControls.js"></script>
   <!-- Other Three.js dependencies -->
   ```

2. **Validate WebGL Support:**
   ```javascript
   // Add to template for debugging
   console.log('WebGL support:', 
     !!window.WebGLRenderingContext);
   ```

3. **Check Browser Compatibility:**
   - Test in different browsers
   - Check WebGL support: webglreport.com
   - Update graphics drivers if needed

### 2. Pattern Generation Errors

#### **Symptom:**
- NFT generation fails
- Pattern data not found
- SVG parsing errors

#### **Solutions:**

1. **Validate NFT Data Injection:**
   ```html
   <!-- Check placeholder replacement -->
   console.log('NFT Data:', nftData);
   // Should not show ___NFT_DATA_PLACEHOLDER___
   ```

2. **Test Pattern SVG Validity:**
   ```javascript
   // Test SVG parsing
   origamiPatterns.forEach(pattern => {
     const parser = new DOMParser();
     const doc = parser.parseFromString(pattern.svgContent, 'image/svg+xml');
     console.log(pattern.name, doc.documentElement.tagName === 'svg');
   });
   ```

## Rollback Procedures

### 1. Emergency Rollback to Monolithic Template

If the modular system fails completely, you can quickly revert to the original template:

#### **Step 1: Restore Original Files**
```bash
# Use backup files
cp public/index.html dist/template.html

# Or restore from git
git checkout HEAD~10 -- public/index.html
cp public/index.html dist/template.html
```

#### **Step 2: Update Webpack Configuration**
```bash
# Restore simple webpack config
cp webpack.config.old.js webpack.config.js

# Or use direct file serving
# No webpack needed - serve public/index.html directly
```

#### **Step 3: Verify Functionality**
```bash
# Test original template
open dist/template.html
# Or serve directly from public/
python -m http.server 8000 --directory public/
```

### 2. Partial Rollback - Keep Some Modules

#### **Disable Problematic Partials:**
```html
<!-- In index.ejs, comment out problematic includes -->
<%- include('partials/head') %>
<!-- <%- include('partials/problematic-section') %> -->
<div>Fallback content</div>
<%- include('partials/scripts/three-setup') %>
```

#### **Replace with Static Content:**
```html
<!-- Replace dynamic partial with static HTML -->
<!-- <%- include('partials/body-content') %> -->
<div class="container-fluid">
    <!-- Fallback HTML structure -->
</div>
```

### 3. Selective Module Restoration

#### **Restore Individual Components:**
```bash
# Extract content from original template
grep -A 50 "<head>" public/index.html > temp_head.html

# Manually merge into partials/head.ejs
# Edit and integrate necessary portions
```

## Debugging Strategies

### 1. Template Compilation Debugging

```bash
# Generate template with verbose output
DEBUG=html-bundler-webpack-plugin npm run build

# Test EJS compilation separately
node -e "const ejs = require('ejs'); console.log(ejs.renderFile('src/template/index.ejs'))"
```

### 2. Build Output Analysis

```bash
# Analyze generated HTML
wc -l dist/template.html  # Line count
grep -c "script" dist/template.html  # Script tag count
grep -c "origami" dist/template.html  # Pattern references
```

### 3. Browser Console Debugging

```javascript
// Add debug output to templates
console.log('Template loaded:', new Date());
console.log('Patterns available:', origamiPatterns ? origamiPatterns.length : 0);
console.log('Three.js version:', THREE ? THREE.REVISION : 'Not loaded');
```

### 4. Network Analysis

- Check browser Network tab for failed resource loads
- Verify all assets are properly inlined
- Monitor JavaScript execution errors

## Prevention Best Practices

### 1. **Regular Backups**
```bash
# Before major changes
cp webpack.config.js webpack.config.js.backup
git add . && git commit -m "Backup before template changes"
```

### 2. **Incremental Development**
- Test small changes frequently
- Build and validate after each partial modification
- Keep working versions tagged in git

### 3. **Environment Consistency**
```bash
# Lock dependencies
npm ci  # Instead of npm install

# Document Node.js version
echo "node $(node --version)" > .nvmrc
```

### 4. **Automated Testing**
```bash
# Add build test to package.json
"test:build": "npm run build && test -f dist/template.html"
```

## Getting Help

### 1. **Check Logs**
- Webpack build output
- Browser developer console
- Node.js process output

### 2. **Compare Working State**
```bash
git diff HEAD~1 -- src/template/
git log --oneline --since="1 week ago" -- src/template/
```

### 3. **Validate Environment**
```bash
node --version  # Should be 18+
npm --version
npm list --depth=0  # Check dependencies
```

This troubleshooting guide should help resolve most issues with the modular template system. When in doubt, the rollback procedures ensure you can always return to a working state.