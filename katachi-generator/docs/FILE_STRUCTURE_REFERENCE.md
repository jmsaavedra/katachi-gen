# File Structure Reference

## Overview

This document provides detailed descriptions of each component in the modularized HTML template system, including their purpose, dependencies, load order, and asset handling.

## Directory Structure

```
katachi-generator/
├── src/template/                 # Modular template system
│   ├── index.ejs                # Main template orchestrator
│   └── partials/                # Template components
│       ├── head.ejs             # HTML head section
│       ├── body-content.ejs     # Main HTML structure
│       ├── patterns/            # Origami SVG patterns
│       │   ├── index.ejs        # Pattern aggregator
│       │   ├── airplane.ejs     # Individual patterns
│       │   ├── crane.ejs
│       │   ├── flower.ejs
│       │   ├── hypar.ejs
│       │   └── pinwheel.ejs
│       ├── scripts/             # JavaScript modules
│       │   ├── three-setup.ejs  # Three.js initialization
│       │   ├── origami.ejs      # Origami rendering
│       │   └── interactions.ejs # User interactions
│       └── styles/              # CSS modules
│           ├── bootstrap.ejs    # Bootstrap framework
│           ├── custom.ejs       # Custom styles
│           └── animations.ejs   # Animation styles
├── public/                      # Static assets and original template
│   ├── index.html              # Original monolithic template
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript libraries
│   └── assets/                 # Images and resources
├── dist/                       # Build output
│   └── template.html           # Final compiled template
├── webpack.config.js           # Build configuration
└── docs/                       # Documentation
```

## Component Descriptions

### 1. Main Template Files

#### `/src/template/index.ejs`
**Purpose**: Main template orchestrator that includes all partials in proper order

**Content**:
```html
<!DOCTYPE html>
<html lang="en">
<%- include('partials/head') %>
<body>
    <%- include('partials/body-content') %>
    <%- include('partials/scripts/three-setup') %>
    <%- include('partials/scripts/origami') %>
    <%- include('partials/scripts/interactions') %>
    <%- include('partials/patterns/index') %>
</body>
</html>
```

**Key Features**:
- Entry point for EJS template compilation
- Defines document structure and load order
- Includes all necessary partials
- Sets HTML5 doctype and language

**Dependencies**: All partials in `/src/template/partials/`

**Load Order**: This file defines the critical load order for the application

---

### 2. HTML Head Section

#### `/src/template/partials/head.ejs`
**Purpose**: Manages HTML head content including meta tags, title, and styles

**Key Sections**:
1. **Meta Tags**: Charset, viewport, title
2. **External Libraries**: jQuery UI CSS
3. **Style Includes**: Bootstrap, custom, animations
4. **Global Configuration**: NFT data placeholder, edit mode settings

**Dependencies**:
- `styles/bootstrap.ejs`
- `styles/custom.ejs`
- `styles/animations.ejs`

**Important Variables**:
```javascript
const nftData = ___NFT_DATA_PLACEHOLDER___;  // Replaced during build
const editMode = false;                       // Runtime configuration
window.editMode = editMode;                   // Global access
```

**Asset Handling**: Links to external CSS, inlines internal styles

---

### 3. Main Content Structure

#### `/src/template/partials/body-content.ejs`
**Purpose**: Defines the main HTML structure for the Katachi generator interface

**Key Sections**:
1. **Header**: Application title and navigation
2. **Canvas Container**: Three.js rendering area
3. **Control Panel**: UI controls and buttons
4. **Loading Indicators**: Progress feedback
5. **Modal Container**: Popup dialogs
6. **Hidden Elements**: Template storage

**Important IDs**:
- `#canvas-container`: Three.js canvas attachment point
- `#control-panel`: UI controls container
- `#loading-indicator`: Loading state display
- `#modal-container`: Modal dialog container

**Bootstrap Grid**: Uses Bootstrap's responsive grid system

**Status**: ⚠️ Currently contains placeholder content - needs migration from original template

---

### 4. Style Components

#### `/src/template/partials/styles/bootstrap.ejs`
**Purpose**: Bootstrap framework CSS integration

**Content**:
```html
<style>
/* Bootstrap 4/5 framework styles */
/* Grid system, components, utilities */
/* Responsive breakpoints */
</style>
```

**Load Order**: First in style loading sequence
**Dependencies**: None (self-contained)
**Customizations**: Any Bootstrap overrides should be included here

#### `/src/template/partials/styles/custom.ejs`
**Purpose**: Application-specific styles for Katachi generator

**Key Style Categories**:
- Layout and positioning
- Color schemes and branding
- Component-specific styles
- Responsive design adjustments

**Load Order**: Second (after Bootstrap)
**Dependencies**: May reference Bootstrap classes
**Important**: This file should contain the majority of custom application styles

#### `/src/template/partials/styles/animations.ejs`
**Purpose**: CSS animations, keyframes, and transitions

**Content Types**:
- Loading spinner animations
- Fade in/out transitions
- Origami folding visual effects
- UI interaction feedback

**Load Order**: Third (final styles)
**Dependencies**: May reference custom classes from custom.ejs
**Performance**: Consider animation performance on mobile devices

---

### 5. JavaScript Components

#### `/src/template/partials/scripts/three-setup.ejs`
**Purpose**: Three.js library loading and initial scene setup

**Key Sections**:
1. **External Libraries**: jQuery, Three.js, controls
2. **Utility Libraries**: Underscore, SVGLoader, Earcut
3. **Origami Libraries**: Fold.js, custom simulation scripts
4. **Global Initialization**: Scene setup, configuration variables

**Critical Libraries**:
- `three.min.js`: Core Three.js library
- `TrackballControls.js`: Camera controls
- `SVGLoader.js`: SVG pattern parsing
- `fold.js`: Origami folding algorithms

**Load Order**: Must load before origami.ejs and interactions.ejs
**Global Variables**: Sets up `window.nftRenderComplete`, `window.renderingComplete`

#### `/src/template/partials/scripts/origami.ejs`
**Purpose**: Origami-specific rendering and folding logic

**Key Functions**:
- Pattern parsing and processing
- 3D mesh generation from SVG patterns
- Folding animation algorithms
- Rendering optimization

**Dependencies**:
- Three.js (from three-setup.ejs)
- Pattern data (from patterns/index.ejs)
- Global configuration variables

**Status**: ⚠️ Placeholder - needs actual origami logic implementation

#### `/src/template/partials/scripts/interactions.ejs`
**Purpose**: User interaction handling and UI control logic

**Key Features**:
- Event listeners for UI controls
- Pattern selection handling
- Folding percentage controls
- Export/download functionality

**Dependencies**:
- Three.js scene objects
- Origami rendering functions
- DOM elements from body-content.ejs

**Status**: ⚠️ Placeholder - needs interaction logic implementation

---

### 6. Pattern System

#### `/src/template/partials/patterns/index.ejs`
**Purpose**: Aggregates all origami patterns into a single JavaScript array

**Key Features**:
```javascript
// Includes all pattern files
<%- include('./airplane.ejs') %>
<%- include('./crane.ejs') %>
// ... other patterns

// Creates global patterns array
const origamiPatterns = [
    airplanePattern,
    cranePattern,
    // ... all patterns
];

// Exports for both browser and Node.js
window.origamiPatterns = origamiPatterns;
module.exports = { origamiPatterns, ... };
```

**Load Order**: After all script includes but before main application logic
**Global Access**: Available as `window.origamiPatterns`

#### Individual Pattern Files

**Format**: `/src/template/partials/patterns/[pattern-name].ejs`

**Structure**:
```javascript
const [patternName]Pattern = {
    maxFolding: 95,                    // Maximum fold percentage
    name: "[pattern-name].svg",        // Pattern identifier
    patternType: "[Pattern Display Name]", // Human-readable name
    svgContent: `<svg>...</svg>`       // Complete SVG markup
};
```

**Current Patterns**:
- `airplane.ejs`: Paper airplane pattern
- `crane.ejs`: Traditional origami crane
- `flower.ejs`: Floral origami pattern
- `hypar.ejs`: Hyperbolic paraboloid
- `pinwheel.ejs`: Spinning pinwheel pattern

**SVG Requirements**:
- Must include viewBox for proper scaling
- Should use stroke colors: `#000` (black), `#f00` (red), `#00f` (blue)
- Opacity can be used for fold hints (`opacity="0.5"`)

---

## Dependencies and Load Order

### Critical Load Order
```
1. HTML Structure (index.ejs, body-content.ejs)
2. CSS Styles (bootstrap → custom → animations)
3. JavaScript Libraries (three-setup.ejs)
4. Pattern Data (patterns/index.ejs)
5. Application Logic (origami.ejs, interactions.ejs)
```

### Dependency Graph
```
index.ejs
├── head.ejs
│   ├── styles/bootstrap.ejs
│   ├── styles/custom.ejs
│   └── styles/animations.ejs
├── body-content.ejs
├── scripts/three-setup.ejs (provides: THREE, jQuery, utilities)
├── scripts/origami.ejs (requires: THREE, origamiPatterns)
├── scripts/interactions.ejs (requires: THREE, DOM elements, origami functions)
└── patterns/index.ejs
    ├── airplane.ejs
    ├── crane.ejs
    ├── flower.ejs
    ├── hypar.ejs
    └── pinwheel.ejs
```

### Inter-Component Communication

**Global Variables**:
- `window.origamiPatterns`: Pattern data array
- `window.nftRenderComplete`: Render completion flag
- `window.renderingComplete`: Global render state
- `window.editMode`: Edit mode configuration
- `nftData`: NFT-specific data (injected during build)

**Event System**:
- DOM events for user interactions
- Three.js render loop events
- Custom events for component communication

---

## Asset Handling

### Build-Time Assets
- **EJS Templates**: Processed and included during build
- **CSS**: Inlined as `<style>` tags
- **JavaScript**: Inlined as `<script>` tags
- **Images**: Converted to data URLs and inlined
- **Fonts**: Converted to data URLs and inlined

### Runtime Assets
- **Three.js Libraries**: Loaded from external CDNs or local files
- **SVG Patterns**: Embedded as JavaScript strings
- **Generated Meshes**: Created dynamically by Three.js

### Asset Optimization
- **SVG Minification**: Patterns should be optimized for size
- **JavaScript Minification**: Production builds minify inlined scripts
- **CSS Optimization**: Unused styles should be removed
- **Image Compression**: All images converted to efficient data URLs

---

## Performance Considerations

### Template Size
- **Target Size**: ~300KB final HTML (similar to original)
- **Pattern Data**: ~50KB total for all SVG patterns
- **JavaScript**: ~200KB for Three.js and application logic
- **CSS**: ~30KB for styles and animations

### Load Performance
- **Single File**: No external requests after initial load
- **Inline Assets**: Everything embedded for offline functionality
- **Minification**: Production builds are compressed
- **Critical CSS**: Styles needed for initial render are inlined first

### Runtime Performance
- **Three.js Optimization**: Use efficient rendering techniques
- **Pattern Caching**: SVG parsing results should be cached
- **Animation Performance**: Consider 60fps target for smooth animations
- **Memory Management**: Clean up unused Three.js objects

---

## Deployment Considerations

### Vercel Compatibility
- **Single File Output**: `dist/template.html` is self-contained
- **Static Hosting**: No server-side processing required after build
- **Edge Deployment**: Can be served from CDN edges globally

### NFT Generation Pipeline
- **Template Injection**: `___NFT_DATA_PLACEHOLDER___` replaced with actual NFT data
- **Metadata Generation**: Template used to generate NFT metadata
- **Thumbnail Creation**: Puppeteer renders template for preview images

### Browser Compatibility
- **WebGL Support**: Required for Three.js rendering
- **ES6+ Features**: Modern JavaScript syntax used throughout
- **Mobile Support**: Responsive design for mobile devices
- **Cross-Browser**: Tested on Chrome, Firefox, Safari, Edge

This file structure enables maintainable, modular development while producing a single, optimized HTML file for deployment and NFT generation.