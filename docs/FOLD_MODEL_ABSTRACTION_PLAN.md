# FOLD Model Abstraction Plan

## Executive Summary

**Current State**: ALL 5 origami patterns are embedded in every generated NFT HTML file, regardless of which pattern is selected for that specific NFT.

**Goal**: Refactor the build process to only include the single selected origami pattern in each NFT's HTML file, reducing file size and improving efficiency.

---

## 1. Current State Analysis

### 1.1 Pattern Inclusion - **CONFIRMED**

✅ **YES, all templates are currently included in every HTML file**

Generated test HTML analysis:
- **Total file size**: 7,306,057 bytes (7.1 MB)
- **All 5 patterns present**: airplane, crane, hypar, pinwheel, flower
- **Pattern SVG data**: ~119 KB total
  - FTpoly7.svg (Flower): 66 KB
  - hypar.svg: 25 KB
  - traditionalCrane.svg: 21 KB
  - airplane.svg: 4 KB
  - pinwheelBase.svg: 3 KB

### 1.2 Current Build Process Flow

```
Template Generation (Server-side)
  │
  ├─> index.ejs (main template)
  │    ├─> head.ejs (declares: let origamiPatterns = [])
  │    ├─> body-content.ejs
  │    ├─> scripts/shaders.min.ejs
  │    ├─> scripts/libraries.min.ejs
  │    ├─> scripts/simulation.min.ejs
  │    ├─> scripts/origami.min.ejs (pattern selection logic)
  │    ├─> scripts/interactions.min.ejs
  │    ├─> ui-controls.min.ejs
  │    └─> patterns/index.ejs ← **ALL PATTERNS LOADED HERE**
  │         ├─> airplane.ejs
  │         ├─> crane.ejs
  │         ├─> hypar.ejs
  │         ├─> pinwheel.ejs
  │         └─> flower.ejs
  │
  └─> Pattern Selection (Client-side at runtime)
       Uses: walletAddress + seed2 → deterministic hash → pattern index
```

### 1.3 Pattern Selection Logic

**Location**: `src/template/partials/scripts/origami.ejs` (lines 154-173)

**Algorithm**:
```javascript
// Create deterministic seed from wallet address + seed2
var patternSeed = walletAddress + '_' + seed2;

// Hash the seed
var hash = 0;
for (var i = 0; i < patternSeed.length; i++) {
    hash = ((hash * 31) + patternSeed.charCodeAt(i)) >>> 0;
}

// Linear Congruential Generator for distribution
var rng = (hash * 1664525 + 1013904223) >>> 0;
rng = (rng * 1664525 + 1013904223) >>> 0;

// Convert to pattern index
var randomFloat = (rng >>> 0) / 4294967296;
var patternIndex = Math.floor(randomFloat * origamiPatterns.length);
var selectedPattern = origamiPatterns[patternIndex];
```

---

## 2. Origami Pattern Data Format

### 2.1 Pattern Object Structure

Each origami pattern is a JavaScript object with the following schema:

```javascript
{
    maxFolding: number,      // Maximum fold angle for simulation (e.g., 97, 70)
    name: string,            // SVG filename (e.g., "traditionalCrane.svg")
    patternType: string,     // Pattern identifier (e.g., "Crane", "Flower")
    svgContent: string       // Complete SVG XML data (inline or file reference)
}
```

### 2.2 Pattern File Examples

**Example 1: Inline SVG (Crane)**
```javascript
// File: src/template/partials/patterns/crane.ejs
const cranePattern = {
    maxFolding: 97,
    name: "traditionalCrane.svg",
    patternType: "Crane",
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">
        <line stroke="#000" opacity="1" x1="518.68..." />
        <!-- 21 KB of inline SVG data -->
    </svg>`
};
```

**Example 2: File Reference (Flower)**
```javascript
// File: src/template/partials/patterns/flower.ejs
const flowerPattern = {
    maxFolding: 70,
    name: "FTpoly7.svg",
    patternType: "Flower",
    svgContent: `<%- fs.readFileSync(path.join(projectRoot, 'public/svgs/FTpoly7.svg'), 'utf8') %>`
};
```

### 2.3 Pattern Registry

**Location**: `src/template/partials/patterns/index.ejs`

```javascript
// All patterns combined into global array
origamiPatterns = [
    airplanePattern,   // Index 0
    cranePattern,      // Index 1
    hyparPattern,      // Index 2
    pinwheelPattern,   // Index 3
    flowerPattern      // Index 4
];
```

### 2.4 SVG Content Format

The SVG data follows standard SVG specification:
- **Namespace**: `xmlns="http://www.w3.org/2000/svg"`
- **Elements**: `<line>` elements with stroke colors indicating fold types:
  - `stroke="#000"` - Boundary/edge lines
  - `stroke="#f00"` - Mountain folds (red)
  - `stroke="#00f"` - Valley folds (blue)
  - `stroke="#ff0"` - Auxiliary/helper lines (yellow)
- **Attributes**: `x1`, `y1`, `x2`, `y2`, `opacity`, `stroke-width`
- **ViewBox**: Defines coordinate system and visible area

---

## 3. Optimization Plan

### 3.1 Goals

1. **Primary**: Include only the selected pattern in each NFT HTML
2. **Secondary**: Maintain deterministic pattern selection (same wallet + seed2 = same pattern)
3. **Tertiary**: Preserve ability to specify pattern type explicitly

### 3.2 Proposed Architecture

```
Template Generation (Server-side)
  │
  ├─> Pre-compute pattern selection
  │    Input: nftData.walletAddress + nftData.seed2 (+ optional nftData.patternType)
  │    Output: selectedPatternIndex or selectedPatternType
  │
  ├─> Load ONLY the selected pattern
  │    Old: patterns/index.ejs (includes all 5)
  │    New: patterns/{selectedPattern}.ejs (includes 1)
  │
  └─> Generate HTML with single pattern
       Result: 4 patterns × ~30KB = ~120KB saved per NFT
```

### 3.3 Implementation Phases

#### Phase 1: Pattern Selection Utility (New Module)

**File**: `utils/patternSelector.js`

```javascript
/**
 * Deterministic pattern selection matching client-side algorithm
 * @param {string} walletAddress - User's wallet address
 * @param {string} seed2 - Additional randomness seed
 * @param {string} patternType - Optional explicit pattern type
 * @returns {Object} { patternIndex, patternType, patternName }
 */
function selectPattern(walletAddress, seed2, patternType = null) {
    const patterns = [
        { type: 'Airplane', name: 'airplane.ejs' },
        { type: 'Crane', name: 'crane.ejs' },
        { type: 'Hypar', name: 'hypar.ejs' },
        { type: 'Pinwheel', name: 'pinwheel.ejs' },
        { type: 'Flower', name: 'flower.ejs' }
    ];

    // If pattern type specified, use it
    if (patternType) {
        const index = patterns.findIndex(p =>
            p.type.toLowerCase() === patternType.toLowerCase()
        );
        if (index !== -1) {
            return { patternIndex: index, ...patterns[index] };
        }
    }

    // Otherwise, use deterministic hash (EXACT MATCH to client algorithm)
    const patternSeed = (walletAddress || 'default-wallet') + '_' + (seed2 || 'default-seed');

    let hash = 0;
    for (let i = 0; i < patternSeed.length; i++) {
        hash = ((hash * 31) + patternSeed.charCodeAt(i)) >>> 0;
    }

    let rng = (hash * 1664525 + 1013904223) >>> 0;
    rng = (rng * 1664525 + 1013904223) >>> 0;

    const randomFloat = (rng >>> 0) / 4294967296;
    const patternIndex = Math.floor(randomFloat * patterns.length);

    return { patternIndex, ...patterns[patternIndex] };
}

module.exports = { selectPattern };
```

#### Phase 2: Template Generator Integration

**File**: `utils/templateGenerator.js` (modify `generateNFTTemplate()`)

```javascript
async function generateNFTTemplate(data) {
    // 1. Select pattern server-side
    const { selectPattern } = require('./patternSelector');
    const selectedPattern = selectPattern(
        data.walletAddress,
        data.seed2,
        data.patternType
    );

    console.log(`📐 Pre-selected pattern: ${selectedPattern.type} (index ${selectedPattern.patternIndex})`);

    // 2. Pass pattern selection to template
    const templateData = {
        nftData: JSON.stringify({
            ...data,
            // Add pre-selected pattern info
            selectedPattern: {
                type: selectedPattern.type,
                index: selectedPattern.patternIndex
            }
        }),
        // ... existing templateData

        // NEW: Pattern selection for conditional includes
        selectedPatternFile: selectedPattern.name
    };

    // 3. Generate template with single pattern
    const html = await ejs.renderFile(templatePath, templateData, options);

    return html;
}
```

#### Phase 3: Template Structure Refactor

**File**: `src/template/index.ejs` (modify line 62)

```ejs
<!-- OLD: Include all patterns -->
<%- include('partials/patterns/index') %>

<!-- NEW: Include only selected pattern -->
<%- include('partials/patterns/' + selectedPatternFile.replace('.ejs', '')) %>

<!-- NEW: Initialize origamiPatterns with single pattern -->
<script>
    // Pattern was pre-selected and embedded above
    // origamiPatterns array now contains only 1 pattern
    if (typeof window !== 'undefined') {
        window.origamiPatterns = origamiPatterns;
        console.log('✅ Single pattern loaded:', origamiPatterns[0].patternType);
    }
</script>
```

**File**: `src/template/partials/patterns/{pattern}.ejs` (modify each pattern file)

```javascript
// OLD: Define pattern variable
const cranePattern = { ... };

// NEW: Define AND add to array immediately
const cranePattern = { ... };
origamiPatterns = [cranePattern];
```

#### Phase 4: Client-Side Script Simplification

**File**: `src/template/partials/scripts/origami.ejs` (modify lines 149-173)

```javascript
// OLD: Complex pattern selection logic (20+ lines)
var selectedPattern;
var patternIndex;
if (dataToProcess.patternType) {
    // Search for pattern...
} else {
    // Hash seed and compute index...
}

// NEW: Pattern was pre-selected, just use it
if (typeof origamiPatterns !== 'undefined' && origamiPatterns.length > 0) {
    // Only one pattern exists in the array
    var selectedPattern = origamiPatterns[0];
    console.log('📐 Using pre-selected pattern:', selectedPattern.patternType);

    // Verify it matches nftData if available
    if (dataToProcess.selectedPattern) {
        console.log('✅ Pattern verified:',
            selectedPattern.patternType === dataToProcess.selectedPattern.type
        );
    }

    // Continue with pattern loading...
}
```

### 3.4 Testing Strategy

1. **Unit Tests**:
   - Verify `selectPattern()` produces identical results to client algorithm
   - Test cases: known wallet addresses + seeds → expected pattern indices

2. **Integration Tests**:
   - Generate NFT HTML with each pattern type
   - Verify only 1 pattern present in final HTML
   - Measure file size reduction

3. **Regression Tests**:
   - Generate 100 NFTs with random seeds
   - Compare pattern selection to legacy system
   - Ensure 100% match rate

### 3.5 Validation Criteria

- ✅ Pattern selection deterministic (same input = same pattern)
- ✅ Only 1 pattern in final HTML (4 patterns excluded)
- ✅ File size reduced by ~119 KB (SVG data)
- ✅ No breaking changes to NFT display
- ✅ Explicit pattern type selection still works

---

## 4. Expected Outcomes

### 4.1 File Size Savings

| Component | Current | Optimized | Savings |
|-----------|---------|-----------|---------|
| Airplane SVG | 4 KB | 4 KB (if selected) | 0-4 KB |
| Crane SVG | 21 KB | 21 KB (if selected) | 0-21 KB |
| Hypar SVG | 25 KB | 25 KB (if selected) | 0-25 KB |
| Pinwheel SVG | 3 KB | 3 KB (if selected) | 0-3 KB |
| Flower SVG | 66 KB | 66 KB (if selected) | 0-66 KB |
| **Total** | **119 KB** | **~24 KB avg** | **~95 KB avg** |

**Per-NFT Savings**: ~80% reduction in pattern data (95 KB / 119 KB)

### 4.2 Performance Improvements

- **Faster page load**: Less data to download
- **Faster parsing**: Less JavaScript to parse
- **Lower memory**: Single pattern object vs 5 patterns
- **Cleaner debugging**: Only relevant pattern in DevTools

### 4.3 Maintainability Benefits

- **Clearer intent**: Generated HTML shows which pattern was selected
- **Easier debugging**: No confusion about which pattern is active
- **Better caching**: Pattern-specific cache keys possible
- **Simpler client code**: No runtime pattern selection logic needed

---

## 5. Migration Path

### 5.1 Backwards Compatibility

**Option A: Dual Mode (Recommended)**
- Keep legacy client-side selection as fallback
- Use server-side selection for new NFTs
- Detect mode: `if (origamiPatterns.length === 1) { /* pre-selected */ }`

**Option B: Clean Break**
- All new NFTs use server-side selection only
- Legacy NFTs unchanged (already generated)
- No backwards compatibility needed

### 5.2 Rollout Plan

1. **Week 1**: Implement `patternSelector.js` and unit tests
2. **Week 2**: Integrate with `templateGenerator.js`, update templates
3. **Week 3**: Test generation with all patterns, measure savings
4. **Week 4**: Deploy to staging, generate test NFTs
5. **Week 5**: Production deployment with monitoring

---

## 6. Future Enhancements

### 6.1 Dynamic Pattern Registry

Instead of hardcoding 5 patterns, scan `partials/patterns/` directory:

```javascript
const patterns = fs.readdirSync(patternsDir)
    .filter(f => f.endsWith('.ejs') && f !== 'index.ejs')
    .map(f => require(`./patterns/${f}`));
```

### 6.2 Pattern Metadata Cache

Cache pattern metadata (maxFolding, type, name) separately from SVG content:

```javascript
// patterns-metadata.json
[
    { "type": "Crane", "maxFolding": 97, "file": "crane.ejs" },
    { "type": "Flower", "maxFolding": 70, "file": "flower.ejs" }
]
```

### 6.3 Custom FOLD Data Support

Extend to support Mitani-generated patterns and other algorithmic patterns:

```javascript
if (data.fold) {
    // Use custom FOLD data, no pattern file needed
    return generateWithCustomFold(data.fold);
} else {
    // Use pre-defined pattern
    return generateWithPattern(selectedPattern);
}
```

---

## 7. Related Work

- **Mitani Algorithm Branch**: Custom FOLD data loading (experimental)
- **Parametric Crane**: Pattern generation with parameters
- **Template System**: Modular EJS architecture enables this optimization

---

## Appendix: File Size Deep Dive

### Current Template Breakdown

```
Total: 7,306,057 bytes (7.1 MB)

Estimated composition:
- Three.js library: ~600 KB
- Origami Simulator JS: ~400 KB
- WebGL shaders: ~30 KB
- Pattern SVGs: ~119 KB (all 5 patterns)
- Texture images (base64): ~5.5 MB (5 test images)
- HTML/CSS/other JS: ~600 KB
```

### Optimization Priority

1. **Textures (5.5 MB)**: Already optimized, essential for NFT
2. **JavaScript libraries (1 MB)**: Consider lazy loading, tree shaking
3. **Pattern SVGs (119 KB)**: **← THIS OPTIMIZATION**
4. **Other assets (600 KB)**: Minification, compression

**Pattern optimization is the low-hanging fruit** with:
- ✅ Significant savings (~80% reduction in pattern data)
- ✅ No runtime performance impact
- ✅ Maintains deterministic behavior
- ✅ Clean implementation (server-side selection)
