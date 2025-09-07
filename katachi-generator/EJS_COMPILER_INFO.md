# EJS Compiler System Documentation

## Overview

The EJS (Embedded JavaScript) compiler system generates self-contained HTML files for NFT origami artwork. It takes user-uploaded images and selected origami patterns, then compiles them into complete, portable HTML files with embedded 3D rendering capabilities.

## Core Architecture

### **Template Structure**
```
src/template/
├── index.ejs                    # Main template entry point
└── partials/
    ├── head.ejs                 # HTML head section
    ├── body-content.ejs         # Main body structure
    ├── patterns/
    │   ├── index.ejs            # Pattern aggregator
    │   ├── airplane.ejs         # Airplane pattern definition
    │   ├── crane.ejs            # Crane pattern definition
    │   ├── hypar.ejs            # Hypar pattern definition
    │   ├── pinwheel.ejs         # Pinwheel pattern definition
    │   └── flower.ejs           # Flower pattern definition
    ├── scripts/
    │   ├── libraries.ejs        # All JavaScript libraries
    │   ├── simulation.ejs       # Origami simulation logic
    │   ├── origami.ejs          # Core origami rendering
    │   ├── interactions.ejs     # User interaction handlers
    │   ├── three-setup.ejs      # Three.js initialization
    │   └── shaders.ejs          # WebGL shaders
    └── styles/
        ├── bootstrap.ejs        # Bootstrap CSS framework
        ├── custom.ejs           # Custom styling
        └── animations.ejs       # Animation CSS
```

## Template Generation Process

### **1. Input Processing**
The `generateNFTTemplate()` function accepts:
```javascript
{
    walletAddress: "0x...",           // User's wallet address
    patternType: "flower",            // Selected origami pattern
    seed2: "random-seed",             // Randomization seed
    images: [                         // Array of 5 base64-encoded images
        {
            name: "image1.jpg",
            data: "data:image/jpeg;base64,..."
        }
        // ... 4 more images
    ],
    forMinting: false,                // Production vs test mode
    testInterface: true               // Called from test.html
}
```

### **2. Data Structure Creation**
Transforms input into standardized NFT data structure:
```javascript
const nftData = {
    walletAddress: "0x...",
    patternType: "flower",
    seed2: "random-seed",
    images: [...],                    // Base64 image data
    generatedAt: "2025-01-07T...",    // ISO timestamp
    templateVersion: "2.0-modular",   // EJS system version
    metadata: {
        imageCount: 5,
        forMinting: false,
        testMode: true
    }
};
```

### **3. EJS Compilation**
Uses `ejs.renderFile()` with template data:
```javascript
const templateData = {
    nftData: JSON.stringify(nftData), // Embedded as JSON string
    jqueryUICSS: "...",               // Inline CSS content
    mainCSS: "...",                   // Custom CSS content
    title: "Katachi Gen",
    testMode: boolean,
    fs: fs,                           // File system access
    path: path,                       # Path utilities
    projectRoot: "/path/to/project",  // Root directory
    readFile: (filePath) => {...},   // File reading utility
    inlineAsset: (assetPath) => {...} // Asset inlining utility
};
```

## JavaScript Library Embedding

### **Complete Library Stack**
The EJS system embeds these libraries using `fs.readFileSync()`:

**Core Libraries:**
- **jQuery 3.2.1** (`jquery-3.2.1.min.js`) - DOM manipulation
- **jQuery UI** (`jquery-ui.min.js`) - UI components
- **Bootstrap/Flat-UI** (`flat-ui.min.js`) - UI framework

**3D Graphics Stack:**
- **Three.js** (`three.min.js`) - Complete 3D rendering engine
- **TrackballControls** (`TrackballControls.js`) - Camera controls
- **SVGLoader** (`SVGLoader.js`) - SVG pattern loading
- **WebVR** (`WebVR.js`) - VR support

**Origami-Specific:**
- **Underscore.js** (`underscore-min.js`) - Utility functions
- **Earcut** (`earcut.js`) - Polygon triangulation
- **Fold.js** (`fold.js`) - Origami fold processing

### **Embedding Process**
```javascript
// Example from libraries.ejs
<script type="text/javascript">
<%- fs.readFileSync(path.join(projectRoot, 'public/js/three.min.js'), 'utf8') %>
</script>
```

## Origami Pattern System

### **Pattern Definition Structure**
Each pattern file (e.g., `flower.ejs`) defines:
```javascript
const flowerPattern = {
    maxFolding: 70,                   // Maximum fold percentage
    name: "FTpoly7.svg",              // Pattern file name
    patternType: "Flower",            // Pattern type identifier
    svgContent: `<svg xmlns="...">    // Complete SVG geometry
        <line stroke="#000" opacity="1" x1="10000" y1="3660" 
              x2="10000" y2="5000" stroke-width="33.33"/>
        <!-- Hundreds more line elements -->
    </svg>`
};
```

### **Pattern Aggregation**
The `patterns/index.ejs` combines all patterns:
```javascript
// Import all pattern definitions
<%- include('./airplane.ejs') %>
<%- include('./crane.ejs') %>
<%- include('./hypar.ejs') %>
<%- include('./pinwheel.ejs') %>
<%- include('./flower.ejs') %>

// Create global patterns array
origamiPatterns = [
    airplanePattern,
    cranePattern,
    hyparPattern,
    pinwheelPattern,
    flowerPattern
];
```

### **Available Patterns**
1. **Airplane**: Classic paper airplane with clean fold lines
2. **Crane**: Traditional Japanese crane with intricate folding
3. **Hypar**: Hyperbolic paraboloid mathematical form
4. **Pinwheel**: Radial pattern with spinning motion effect
5. **Flower**: Petal-like formations with complex geometry

## Pattern Definition System

### **Individual Pattern Files**
Each origami pattern is defined in its own EJS file with complete SVG geometry:

**File Structure**:
```
src/template/partials/patterns/
├── airplane.ejs    - airplanePattern object
├── crane.ejs       - cranePattern object  
├── hypar.ejs       - hyparPattern object
├── pinwheel.ejs    - pinwheelPattern object
├── flower.ejs      - flowerPattern object
└── index.ejs       - Aggregates all patterns
```

### **Pattern Object Structure**
Each pattern file defines a JavaScript object with this structure:
```javascript
const flowerPattern = {
    maxFolding: 70,                    // Maximum fold percentage for animation
    name: "FTpoly7.svg",               // Original pattern filename reference
    patternType: "Flower",             // Type identifier (matches user selection)
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1000 -1000 12000 12000">
        <line stroke="#000" opacity="1" x1="10000" y1="3660" x2="10000" y2="5000" stroke-width="33.33"/>
        <line stroke="#000" opacity="1" x1="10000" y1="5000" x2="9999" y2="6339" stroke-width="33.33"/>
        <line stroke="#f00" opacity="1" x1="666" y1="486" x2="486" y2="486" stroke-width="2.88"/>
        <!-- Hundreds more <line> elements defining fold geometry -->
    </svg>`
};
```

### **SVG Geometry Format**
The `svgContent` contains the origami crease pattern as SVG `<line>` elements:

**Stroke Colors Indicate Fold Types**:
- **`stroke="#000"`** (Black): Mountain folds or cut lines
- **`stroke="#f00"`** (Red): Valley folds or fold guidelines
- **`stroke="#00f"`** (Blue): Alternative fold indicators (pattern-specific)

**Coordinate System**:
- Uses SVG coordinate space (typically -1000 to 12000 range)
- Each line defined by start point `(x1,y1)` and end point `(x2,y2)`
- `stroke-width` determines line thickness for rendering

**Example Line Elements**:
```svg
<line stroke="#000" opacity="1" x1="10000" y1="3660" x2="10000" y2="5000" stroke-width="33.33"/>
<!-- Mountain fold: vertical line from (10000,3660) to (10000,5000) -->

<line stroke="#f00" opacity="1" x1="666" y1="486" x2="486" y2="486" stroke-width="2.88"/>
<!-- Valley fold: horizontal line from (666,486) to (486,486) -->
```

### **Adding New Patterns**

**1. Create Pattern File**:
Create `src/template/partials/patterns/newpattern.ejs`:
```javascript
const newpatternPattern = {
    maxFolding: 100,
    name: "newpattern.svg",
    patternType: "NewPattern",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
        <!-- Define your fold lines here -->
        <line stroke="#000" x1="0" y1="500" x2="1000" y2="500" stroke-width="2"/>
        <line stroke="#f00" x1="500" y1="0" x2="500" y2="1000" stroke-width="2"/>
    </svg>`
};
```

**2. Register in Index**:
Add to `src/template/partials/patterns/index.ejs`:
```javascript
<%- include('./newpattern.ejs') %>

origamiPatterns = [
    airplanePattern,
    cranePattern,
    hyparPattern,
    pinwheelPattern,
    flowerPattern,
    newpatternPattern  // Add your new pattern
];
```

**3. Update Test Interface**:
Add pattern option to `public/index.html` origamiPatterns array:
```javascript
{ 
    type: 'newpattern', 
    name: 'New Pattern', 
    description: 'Description of your pattern',
    icon: '📐'
}
```

### **Pattern Source Origins**
The SVG geometry in these files represents:
- **Fold lines**: Mountain and valley creases that define the origami structure
- **Cut lines**: Boundaries or edges of the paper
- **Guidelines**: Helper lines for complex folding sequences

These coordinates are typically derived from:
- Origami crease pattern diagrams
- Mathematical fold simulations
- Hand-drawn patterns converted to SVG format
- Computational origami design software output

### **Modifying Existing Patterns**
To modify a pattern's geometry:
1. Edit the `svgContent` string in the appropriate `.ejs` file
2. Adjust `<line>` coordinates to change fold positions
3. Modify `stroke` colors to change fold types (mountain/valley)
4. Update `maxFolding` value to change animation range
5. Test in development by selecting the pattern in the interface

**Important**: Pattern modifications require understanding of origami mathematics and SVG coordinate systems. Invalid geometry may result in non-foldable or visually incorrect 3D models.

## CSS and Styling System

### **Inline CSS Embedding**
The template system reads and embeds CSS files:
```javascript
// From templateGenerator.js
const jqueryUICSS = fs.readFileSync(jqueryUICSSPath, 'utf8');
const mainCSS = fs.readFileSync(mainCSSPath, 'utf8');

// Made available to templates
templateData.jqueryUICSS = jqueryUICSS;
templateData.mainCSS = mainCSS;
```

### **CSS Files Included**
- **jquery-ui.min.css**: jQuery UI component styling
- **main.css**: Custom origami application styles
- Additional CSS partials from `styles/` directory

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