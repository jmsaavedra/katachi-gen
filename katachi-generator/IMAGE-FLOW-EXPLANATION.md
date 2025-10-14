# Image Processing Flow - When & Where

## IMPORTANT: Two Different "Thumbnails" - Don't Confuse Them!

### 1. NFT Images (What Rarible Optimizes)
These are the **texture images** applied to the 3D origami model.

### 2. Preview Thumbnail (Screenshot)
This is a **screenshot** of the rendered HTML taken by Puppeteer.

---

## Complete Flow Diagram

```
Client Request
    ↓
[1] POST /upload-metadata or POST /
    with: { images: [{ url, contractAddress, tokenId }], walletAddress, patternType }
    ↓
[2] handlers/pattern.js:49 - processImagesAsBase64(data)
    ↓
[3] image/processor.js:252 - Process each image in data.images[]
    ↓
    ┌─────────────────────────────────────────────────┐
    │ FOR EACH IMAGE IN data.images[]                │
    │                                                  │
    │ [4] Check: Does image have contractAddress      │
    │     and tokenId?                                │
    │     ↓                                           │
    │     YES → [5] Call Rarible API                  │
    │           utils/raribleClient.js:104            │
    │           GET https://api.rarible.org/v0.1/     │
    │               items/SHAPE:{contract}:{token}    │
    │           ↓                                      │
    │           Get optimized thumbnail URL           │
    │           (preview, big, or initial size)       │
    │           ↓                                      │
    │     [6] Download optimized image from Rarible   │
    │     OR  Download original IPFS URL if no        │
    │         contract info                           │
    │     ↓                                           │
    │     [7] Compress with Sharp                     │
    │         (resize to 800x800, 85% quality)        │
    │     ↓                                           │
    │     [8] Base64 encode                           │
    │     ↓                                           │
    │     [9] Replace image.url with:                 │
    │         "data:image/png;base64,..."            │
    └─────────────────────────────────────────────────┘
    ↓
[10] processedData now has all images as base64
     embedded in the data structure
    ↓
[11] handlers/pattern.js:56 - generateNFTTemplate(processedData)
     utils/templateGenerator.js:146
    ↓
[12] EJS renders HTML with nftData JSON embedded in <script> tag
     src/template/index.ejs includes:
     src/template/partials/scripts/three-setup.ejs
         → const nftData = { images: [...base64 data...] }
    ↓
[13] HTML file written to temp/html/kg_*.html
     handlers/pattern.js:74
    ↓
[14] generateThumbnail(processedData, htmlPath)
     image/thumbnail-html.js:14
     ↓
     [15] Puppeteer launches headless Chrome
     [16] Loads the HTML file
     [17] HTML JavaScript runs:
          - src/template/partials/scripts/origami.ejs:331
          - dataToProcess.images.forEach()
          - THREE.TextureLoader().load(imageSource)
          - imageSource = "data:image/png;base64,..."
          - Loads base64 images as WebGL textures
          - Applies textures to 3D origami model
     [18] Waits for rendering to complete
     [19] Takes 1024x1024 screenshot
     ↓
[20] Screenshot buffer (preview thumbnail) saved
     to temp/thumbnails/thumbnail_*.png
     handlers/pattern.js:84
    ↓
[21] Screenshot uploaded to Arweave/R2
     Used for NFT preview in galleries/marketplaces
```

---

## WHEN Does Rarible Query Happen?

**Line 274 in image/processor.js** - During the `processImagesAsBase64()` call

```javascript
// handlers/pattern.js:49
const processedData = await processImagesAsBase64(data);

// Inside processor.js:272-279
if (image.contractAddress && image.tokenId) {
    console.log(`🔍 Attempting to fetch optimized image from Rarible`);
    const raribleUrl = await getOptimizedImageFromRarible(
        image.contractAddress,
        image.tokenId
    );
    if (raribleUrl) {
        imageUrlToDownload = raribleUrl;  // Use Rarible's optimized URL
    }
}
```

**Timing**: This happens BEFORE HTML generation, as the first step in the handler.

---

## WHERE Are These Images Used?

### The "Optimized" Images (from Rarible) Are Used For:

**Purpose**: WebGL Textures on the 3D Origami Model

**Location in Generated HTML**:
```javascript
// Embedded in <script> tag via EJS templating
const nftData = {
    images: [
        {
            url: "data:image/png;base64,iVBORw0KGgoAAAANS...",  // ← Base64 from Rarible thumbnail
            name: "Image 1",
            originalUrl: "ipfs://bafybei..."
        }
    ]
};
```

**How They're Used** (src/template/partials/scripts/origami.ejs:331-354):
```javascript
// THREE.js TextureLoader loads base64 data
dataToProcess.images.forEach(function(imageData, index) {
    var imageSource = imageData.url;  // "data:image/png;base64,..."

    loader.load(imageSource, function(texture) {
        // Apply to 3D origami model
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        globals.textureLibrary.push(texture);

        // User can select this texture to apply to the origami
    });
});
```

**Result**: The 3D origami model gets textured with the optimized images.

---

## What About the "Preview Thumbnail"?

**This is DIFFERENT** - it's a screenshot of the fully rendered HTML.

**When**: Generated AFTER HTML is created (handlers/pattern.js:79)

**How**:
1. Puppeteer launches Chrome
2. Loads the HTML with embedded base64 textures
3. Waits for WebGL rendering to complete
4. Takes a 1024x1024 screenshot
5. This screenshot becomes the NFT preview image

**Where It's Used**:
- Uploaded to Arweave (permanent storage)
- Used in NFT marketplaces as preview
- Displayed in galleries
- NOT embedded in the HTML itself

---

## Key Insight: Why Rarible Optimization Matters

### Without Rarible (Old Way):
```
IPFS: bafybei.../5.gif (5MB GIF)
  ↓ Download 5MB
  ↓ Compress with Sharp
  ↓ Base64 encode (~6.7MB in HTML)
  ↓ Embed in HTML (huge file)
  ↓ Browser loads 6.7MB base64
  ↓ Apply as texture
  ❌ SLOW, UNRELIABLE, LARGE
```

### With Rarible (New Way):
```
Rarible API: "Use this optimized URL"
  ↓ Download 150KB optimized thumbnail
  ↓ Compress with Sharp
  ↓ Base64 encode (~200KB in HTML)
  ↓ Embed in HTML (reasonable size)
  ↓ Browser loads 200KB base64
  ↓ Apply as texture
  ✅ FAST, RELIABLE, SMALL
```

---

## Summary

**WHEN**: Rarible query happens at the very start, during `processImagesAsBase64()` before HTML generation.

**WHERE USED**: The optimized images are:
1. Base64-encoded and embedded in the HTML `<script>` tag
2. Loaded by THREE.js TextureLoader in the browser
3. Applied as textures to the 3D origami model
4. Rendered by WebGL
5. Captured in the Puppeteer screenshot

**NOT USED FOR**: The Puppeteer screenshot itself (that's generated from the fully rendered HTML)

**THE FIX**: Instead of downloading a 5MB GIF and base64 encoding it (creating a 6.7MB string), we download Rarible's 150KB optimized thumbnail and base64 encode it (creating a 200KB string). The HTML becomes 30x smaller and loads much faster.
