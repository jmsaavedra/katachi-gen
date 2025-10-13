# EJS Template System Documentation

## Overview

The EJS template system generates self-contained HTML files for NFT origami artwork. **Unlike traditional EJS systems with separate `.ejs` template files, this system uses inline JavaScript template literal functions** defined directly in `generateNFT.js`. The system takes user-uploaded images and selected origami patterns, then compiles them into complete, portable HTML files with embedded 3D rendering capabilities.

## Core Architecture

### **Actual Implementation**
The template system uses **inline JavaScript functions** that return template strings, NOT separate EJS files:

```javascript
// All templates are JavaScript functions in generateNFT.js
function generateNFTStyles() { return `<style>...</style>`; }
function generateNFTLibraries() { return `<script>...</script>`; }
function generateNFTScripts() { return `<script>...</script>`; }
function generateNFTData(nftData) { return `<script>const nftData = ${JSON.stringify(nftData)};</script>`; }
```

**There is NO separate template directory structure.** All template generation happens within `/katachi-generator/generator/generateNFT.js` using template literal functions.

## Template Generation Process

### **1. Input Processing**
The `generateHTML()` function accepts:
```javascript
{
    walletAddress: "0x...",           // User's wallet address
    patternType: "flower",            // Selected origami pattern
    seed2: "random-seed",             // Randomization seed
    images: [                         // Array of base64-encoded images
        "data:image/jpeg;base64,..."
    ],
    forMinting: false                 // Production vs test mode
}
```

### **2. Template Assembly**
The HTML is assembled by calling inline functions and concatenating strings:

```javascript
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    ${generateNFTStyles()}
</head>
<body>
    ${generateNFTData(nftData)}
    ${generateNFTLibraries()}
    ${generateNFTScripts()}
</body>
</html>
`;
```

## JavaScript Library Embedding

### **Complete Library Stack**
The inline functions embed these libraries using `fs.readFileSync()`:

**Core Libraries:**
- **jQuery 3.2.1** - DOM manipulation
- **jQuery UI** - UI components  
- **Bootstrap/Flat-UI** - UI framework

**3D Graphics Stack:**
- **Three.js** - Complete 3D rendering engine
- **TrackballControls** - Camera controls
- **SVGLoader** - SVG pattern loading
- **WebVR** - VR support

**Origami-Specific:**
- **Underscore.js** - Utility functions
- **Earcut** - Polygon triangulation
- **Fold.js** - Origami fold processing

### **Embedding Process**
```javascript
// Example from generateNFTLibraries() function
function generateNFTLibraries() {
    const jqueryPath = path.join(__dirname, '../public/js/jquery-3.2.1.min.js');
    const jqueryContent = fs.readFileSync(jqueryPath, 'utf8');
    
    return `<script>${jqueryContent}</script>`;
}
```

## Origami Pattern System

### **Pattern Definition Structure**
Patterns are defined as JavaScript objects within the `generateNFTScripts()` function:

```javascript
const origamiPatterns = [
    {
        maxFolding: 70,
        name: "FTpoly7.svg",
        patternType: "Flower",
        svgContent: `<svg xmlns="...">
            <line stroke="#000" opacity="1" x1="10000" y1="3660" x2="10000" y2="5000"/>
            <!-- More line elements -->
        </svg>`
    },
    // ... more patterns
];
```

### **Available Patterns**
All patterns are embedded inline in the generated HTML:
1. **Airplane**: Classic paper airplane with clean fold lines
2. **Crane**: Traditional Japanese crane with intricate folding
3. **Hypar**: Hyperbolic paraboloid mathematical form
4. **Pinwheel**: Radial pattern with spinning motion effect
5. **Flower**: Petal-like formations with complex geometry

### **Pattern Selection**
Pattern is selected based on `patternType` parameter and embedded in the output HTML.

## CSS and Styling System

### **Inline CSS Embedding**
CSS is embedded via the `generateNFTStyles()` function:

```javascript
function generateNFTStyles() {
    const jqueryUICSS = fs.readFileSync('./public/css/jquery-ui.min.css', 'utf8');
    const mainCSS = fs.readFileSync('./public/css/main.css', 'utf8');
    
    return `
        <style>${jqueryUICSS}</style>
        <style>${mainCSS}</style>
    `;
}
```

### **CSS Files Included**
- **jquery-ui.min.css**: jQuery UI component styling
- **main.css**: Custom origami application styles

## Output Generation

### **Self-Contained HTML Structure**
Generated HTML file contains:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Embedded CSS -->
    <style>/* jQuery UI CSS */</style>
    <style>/* Main CSS */</style>
</head>
<body>
    <!-- NFT Data Injection -->
    <script>
    const nftData = {"walletAddress":"0x...","images":[...]};
    </script>
    
    <!-- All JavaScript Libraries Inline -->
    <script>/* jQuery */</script>
    <script>/* Three.js */</script>
    <script>/* All other libraries */</script>
    
    <!-- Origami Patterns -->
    <script>
    const flowerPattern = {...};
    const origamiPatterns = [...];
    </script>
    
    <!-- Application Logic -->
    <script>/* Origami simulation code */</script>
</body>
</html>
```

### **File Size and Optimization**
- **Typical Output**: 1-2MB per HTML file
- **No External Dependencies**: Completely self-contained
- **Base64 Images**: User images embedded as data URLs
- **Minified Libraries**: Uses minified versions of all JS libraries

## Error Handling

### **EJS Generation Method**
```javascript
async function generateModularTemplate(nftData) {
    // Uses EJS template system
    const html = await ejs.renderFile(templatePath, templateData, {...});
    return html;
}
```

### **Error Handling**
If EJS compilation fails, the system throws an error immediately:
```javascript
} catch (error) {
    console.error('❌ Error generating modular template:', error);
    throw new Error(`EJS template generation failed: ${error.message}`);
}
```

### **Template Validation**
Generated templates are checked for:
- **NFT Data**: Presence of embedded wallet and image data
- **Three.js**: Core 3D rendering library
- **Pattern Type**: Selected origami pattern included
- **Bootstrap**: UI framework availability

## Integration Points

### **Test Interface Integration**
- **Endpoint**: POST request to `/` (root)
- **Request Format**: JSON with images, pattern, wallet data
- **Response**: Generated HTML file path for preview

### **Production Usage**
- **Automated Generation**: Batch processing for NFT collections
- **Template Versioning**: `templateVersion: "2.0-modular"`
- **Metadata Tracking**: Generation timestamps and configuration

## Development and Debugging

### **Console Output**
```
🎨 Generating HTML using modular EJS template system...
✅ Modular template generated successfully
📊 Generated HTML size: 1547829 bytes
📝 Generated HTML preview:
<!DOCTYPE html>...
```

### **Template Preview**
Shows first 1000 characters of generated HTML for debugging

### **File System Requirements**
- Templates must exist in `src/template/` directory
- JavaScript libraries in `public/js/`
- CSS files in `public/css/`
- Asset files accessible via `projectRoot`

## Current Limitations

1. **No Screen Recording**: No CCapture.js integration for GIF/video export
2. **Minimal UI**: Basic 3D rendering interface only
3. **No Interactive Controls**: No sliders, settings panels, or user controls
4. **Static Pattern Loading**: No dynamic pattern selection mechanism
5. **Limited Debugging**: Basic validation and error reporting only
6. **Missing PNG Capture Implementation**: UI elements exist but no actual thumbnail generation

## Thumbnail Capture System

The generated HTML includes a timing mechanism specifically designed for external thumbnail capture:

### **Rendering Completion Flags**
- `window.renderingComplete = true` - Set after textures are applied and model is fully rendered (origami.ejs:459)
- `window.nftRenderComplete = true` - Set immediately when control visibility sequence starts (origami.ejs:27)

### **Control Visibility Timing**
1. Controls are initially hidden when page loads
2. After rendering completes, `showControlsAfterRender()` is called
3. `window.nftRenderComplete = true` is set immediately (signals safe for thumbnail)
4. Controls remain hidden for 5 seconds (thumbnail capture window)
5. Controls appear after 5 second delay

### **Purpose**
- Provides clean thumbnail without UI controls visible
- Ensures origami is fully rendered before capture
- The 5-second delay gives external screenshot tools time to detect the `nftRenderComplete` flag and capture the thumbnail
- External tools can monitor `window.nftRenderComplete` to know when it's safe to take a screenshot

### **Implementation Details**
From `origami.ejs`:
```javascript
// Function to show controls after rendering is complete
window.showControlsAfterRender = function() {
    console.log('🎬 Starting control visibility sequence...');
    window.nftRenderComplete = true;  // Signal for thumbnail capture
    console.log('✅ Set window.nftRenderComplete = true');
    
    setTimeout(function() {
        var controlsBottom = document.getElementById('controlsBottom');
        if (controlsBottom) {
            controlsBottom.style.display = 'flex';
            console.log('✅ Bottom controls shown after 5 second delay');
        }
    }, 5000);  // 5-second window for thumbnail capture
};
```

## TODO: PNG Thumbnail Capture Implementation

**Status**: UI elements present, JavaScript handlers MISSING

### What Exists ✅
- Menu item `#createPNG` in `body-content.ejs` line 27
- Modal button `#doPNGCapture` in `body-content.ejs` line 827
- PNG capture modal UI with size options
- Canvas setup and rendering flag `window.renderingComplete = true`

### What's Missing ❌
Required JavaScript implementations for `interactions.ejs`:

1. **`#createPNG` Click Handler**:
```javascript
setLink("#createPNG", function(){
    globals.shouldScaleCanvas = true;
    $("#screenCaptureModal .gif").hide();
    $("#screenCaptureModal .video").hide();
    $("#screenCaptureModal .png").show();
    $("#screenCaptureModal").modal("show");
});
```

2. **`#doPNGCapture` Click Handler**:
```javascript
setLink("#doPNGCapture", function(){
    globals.shouldScaleCanvas = false;
    globals.capturer = "png";
});
```

3. **PNG Capture Logic in Render Loop** (add to `origami.ejs`):
```javascript
if("png" == globals.capturer) {
    return renderer.domElement.toBlob(function(blob){
        saveAs(blob, globals.screenRecordFilename + ".png");
        globals.capturer = null;
        globals.shouldScaleCanvas = false;
    }, "image/png");
}
```

4. **Required Global Variables**:
```javascript
globals.capturer = null;
globals.shouldScaleCanvas = false;
globals.screenRecordFilename = "katachi-capture";
```

**Priority**: HIGH - Essential for NFT thumbnail generation

## Technical Dependencies

### **Node.js Modules**
- **ejs**: Template rendering engine
- **fs**: File system operations
- **path**: Path manipulation utilities

### **Project Structure Requirements**
- Modular EJS templates in `src/template/`
- JavaScript libraries in `public/js/`
- CSS assets in `public/css/`
- Proper `projectRoot` configuration

## Usage Example

```javascript
const { generateNFTTemplate } = require('./utils/templateGenerator');

const requestData = {
    walletAddress: "0x123...",
    patternType: "flower",
    seed2: "my-seed",
    images: [
        { name: "img1.jpg", data: "data:image/jpeg;base64,..." },
        // ... 4 more images
    ]
};

const html = await generateNFTTemplate(requestData);
// Result: Complete self-contained HTML file with embedded 3D origami
```

## Output Characteristics

- **Portable**: No external dependencies, works offline
- **Interactive**: Full 3D origami simulation with mouse controls
- **Deterministic**: Same inputs produce identical outputs
- **Lightweight**: Optimized for NFT distribution and viewing
- **Compatible**: Works in all modern web browsers with WebGL support