# Development Workflow Guide

## Overview

This guide covers the new development workflow for the modularized HTML template system. The template is now organized into logical partials that can be edited independently while maintaining a single-file build output.

## Development Setup

### Prerequisites
- Node.js 18+ installed
- Project dependencies installed: `npm install`

### Development Commands
```bash
# Start development server with hot reloading
npm run serve

# Build for production
npm run build

# Watch mode for continuous building
npm run watch

# Development build (faster, less optimization)
npm run dev
```

## Editing Workflows

### 1. Editing CSS Styles

CSS is organized into three main categories within `/src/template/partials/styles/`:

#### **Bootstrap Styles** (`styles/bootstrap.ejs`)
```html
<!-- Bootstrap framework CSS -->
<style>
/* Bootstrap framework styles */
/* Customizations to Bootstrap components */
</style>
```

**When to edit:**
- Modifying Bootstrap component behavior
- Adding Bootstrap utility classes
- Overriding Bootstrap defaults

#### **Custom Styles** (`styles/custom.ejs`)
```html
<!-- Application-specific styles -->
<style>
/* Katachi generator specific styles */
/* UI controls, layout, branding */
</style>
```

**When to edit:**
- Application-specific styling
- Layout modifications
- Custom component styles
- Branding and color schemes

#### **Animation Styles** (`styles/animations.ejs`)
```html
<!-- CSS animations and transitions -->
<style>
/* Keyframe animations */
/* Transition effects */
/* Loading indicators */
</style>
```

**When to edit:**
- Adding new animations
- Modifying loading effects
- Transition timing adjustments

#### **Development Workflow for Styles:**
1. Identify which style category your change belongs to
2. Edit the appropriate `.ejs` file
3. Save changes (auto-reload in development mode)
4. Test in browser
5. Build for production: `npm run build`

### 2. Editing JavaScript

JavaScript is organized into functional modules within `/src/template/partials/scripts/`:

#### **Three.js Setup** (`scripts/three-setup.ejs`)
```html
<!-- Three.js initialization and library loading -->
<script src="..."></script>
<script>
// Three.js scene setup
// Camera and renderer configuration
// Library initialization
</script>
```

**When to edit:**
- Adding new Three.js libraries
- Modifying render settings
- Updating library versions
- Scene initialization changes

#### **Origami Logic** (`scripts/origami.ejs`)
```html
<!-- Origami rendering and folding logic -->
<script>
// Origami folding algorithms
// 3D mesh generation
// Pattern processing
</script>
```

**When to edit:**
- Folding algorithm improvements
- New origami techniques
- Mesh generation optimization
- Pattern processing logic

#### **Interactions** (`scripts/interactions.ejs`)
```html
<!-- User interaction handlers -->
<script>
// Event listeners
// UI controls
// User input processing
</script>
```

**When to edit:**
- Adding new UI controls
- Modifying user interactions
- Event handling improvements
- Input validation

#### **Development Workflow for JavaScript:**
1. Identify the functional area of your change
2. Edit the appropriate script partial
3. Test functionality in development server
4. Check browser console for errors
5. Validate in production build

### 3. Adding New Origami Patterns

The pattern system is designed for easy extensibility:

#### **Step 1: Create Pattern File**
Create `/src/template/partials/patterns/[pattern-name].ejs`:

```html
<!-- [Pattern Name] Origami Pattern SVG -->
<script>
const [patternName]Pattern = {
    maxFolding: 95, 
    name: "[pattern-name].svg", 
    patternType: "[Pattern Name]",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">
        <!-- SVG path data -->
    </svg>`
};

// Export pattern for use in template
if (typeof module !== 'undefined' && module.exports) {
    module.exports = [patternName]Pattern;
}
</script>
```

#### **Step 2: Register in Pattern Index**
Edit `/src/template/partials/patterns/index.ejs`:

```html
<!-- Add include for new pattern -->
<%- include('./[pattern-name].ejs') %>

// Add to patterns array
const origamiPatterns = [
    airplanePattern,
    cranePattern,
    hyparPattern,
    pinwheelPattern,
    flowerPattern,
    [patternName]Pattern  // Add new pattern
];

// Add to exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        origamiPatterns,
        // ... existing patterns
        [patternName]Pattern  // Add to exports
    };
}
```

#### **Step 3: Test Pattern**
1. Build template: `npm run build`
2. Test in development server
3. Verify pattern appears in selection
4. Test folding functionality

### 4. Modifying HTML Structure

HTML structure is managed in `/src/template/partials/body-content.ejs`:

#### **Current Structure:**
```html
<!-- Primary container for the Katachi generator -->
<div class="container-fluid">
    <!-- Header section -->
    <div class="row">
        <div class="col-12">
            <header>
                <h1>Katachi Gen</h1>
            </header>
        </div>
    </div>
    
    <!-- Main content area -->
    <div class="row">
        <div class="col-12">
            <div id="canvas-container">
                <!-- Three.js canvas -->
            </div>
            
            <div id="control-panel">
                <!-- UI controls -->
            </div>
        </div>
    </div>
</div>
```

#### **Development Workflow for HTML:**
1. Edit `/src/template/partials/body-content.ejs`
2. Maintain Bootstrap grid structure
3. Preserve essential IDs and classes for JavaScript
4. Test responsive behavior
5. Validate accessibility

## Build Process Understanding

### Development Build Flow
```
src/template/index.ejs
├─ EJS preprocessing
├─ Partial inclusion
├─ Variable injection
└─ Asset inlining
   └─ dist/template.html
```

### Key Build Features

1. **EJS Template Processing**
   - Automatic partial inclusion with `<%- include('path') %>`
   - Variable injection during build
   - Conditional rendering support

2. **Asset Inlining**
   - All CSS inlined as `<style>` tags
   - All JavaScript inlined as `<script>` tags
   - Images and fonts converted to data URLs

3. **Single File Output**
   - Final output: `dist/template.html`
   - Self-contained with no external dependencies
   - Ready for NFT metadata generation

## File Watching and Hot Reload

### Development Server Features
- **Automatic Reload**: Changes to any `.ejs` file trigger rebuild
- **Error Reporting**: Build errors displayed in browser console
- **Source Maps**: Available for debugging JavaScript
- **Live Updates**: No manual refresh needed

### Watched Files
- All files in `/src/template/` directory
- All `.ejs` partials and subdirectories
- Associated CSS and JavaScript files
- Asset files (images, fonts)

## Testing Your Changes

### 1. Development Testing
```bash
# Start development server
npm run serve

# Open browser to http://localhost:9000
# Make changes to template files
# Verify automatic reload and functionality
```

### 2. Production Build Testing
```bash
# Build production version
npm run build

# Test built template
# Open dist/template.html in browser
# Verify all functionality works identically
```

### 3. Integration Testing
```bash
# Test with actual NFT data
# Verify pattern generation works
# Check Three.js rendering
# Validate responsive design
```

## Best Practices

### 1. **File Organization**
- Keep partials focused on single responsibilities
- Use descriptive filenames
- Maintain consistent code formatting
- Comment complex logic

### 2. **Template Variables**
- Use EJS variables for dynamic content
- Document available variables
- Provide fallbacks for optional data

### 3. **Performance Considerations**
- Minimize inline styles/scripts where possible
- Optimize SVG patterns for size
- Test build performance regularly

### 4. **Version Control**
- Commit partial changes separately when possible
- Write descriptive commit messages
- Test builds before committing

## Common Development Tasks

### Adding a New UI Control
1. Edit `/src/template/partials/body-content.ejs` for HTML
2. Add styles to `/src/template/partials/styles/custom.ejs`
3. Add interactions to `/src/template/partials/scripts/interactions.ejs`
4. Test functionality in development server

### Updating Three.js Libraries
1. Update library imports in `/src/template/partials/scripts/three-setup.ejs`
2. Test compatibility with existing code
3. Update version numbers in comments
4. Build and test production version

### Modifying Loading Indicators
1. Edit HTML structure in `/src/template/partials/body-content.ejs`
2. Update styles in `/src/template/partials/styles/animations.ejs`
3. Modify show/hide logic in `/src/template/partials/scripts/interactions.ejs`
4. Test loading states

This workflow enables efficient, collaborative development while maintaining the single-file output required for the NFT generation system.