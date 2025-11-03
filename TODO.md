# TODO: Project Improvements

## Implementation Status Summary

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Queue System (Bull/Redis) | ✅ Implemented | - | Full Bull queue with granular progress tracking |
| Vercel Monorepo Setup | ✅ Implemented | - | Dashboard configured and fully operational |
| Visual Analysis (CV/AI) | ❌ Not Implemented | High | Placeholder only - text matching only |
| Alchemy Caching | ✅ Basic Implementation | Medium | Redis cache working, no batching |
| Origami Patterns | ✅ Implemented | - | All 5 patterns working correctly |
| UI Countdown Text | ❌ Not Implemented | Low | Still shows old text |
| Dev Mode File Links | ❌ Not Implemented | Low | URLs exist but not displayed |

---

## 🔄 Queue System for Concurrent Generation Requests

### Status: ✅ FULLY IMPLEMENTED

**See [Completed Features](#completed-features) below for full implementation details.**

The Bull Queue system has been successfully implemented with:

- Real-time progress tracking (8 granular steps during image processing)
- Job status polling with live updates
- Graceful fallback if Redis unavailable
- Progress distribution: 8-82% images, 82-90% pattern, 90-100% uploads

---

## 🚀 Vercel Monorepo Deployment Setup

### Status: ✅ FULLY IMPLEMENTED

**See [Completed Features](#completed-features) below for full implementation details.**

The Vercel monorepo setup has been successfully configured with:

- Root directory settings configured for both projects
- Ignored build step logic to prevent unnecessary rebuilds
- Environment variables properly exposed
- Documentation complete in [VERCEL_SETUP.md](VERCEL_SETUP.md)

---

## 🎨 Enhanced Visual Analysis for NFT Collection Reflection

### Status: ❌ NOT IMPLEMENTED - Text-Based Heuristics Only

### Priority: High

**Current Implementation Status:**

The `analyzeVisualContent` function in [interpret-collection-sentiment.ts:128-179](mcp-server/src/tools/nft/interpret-collection-sentiment.ts#L128-L179) is a **placeholder** that only performs text matching:

```typescript
// Line 146: "In a full implementation, this would analyze the actual image pixels"
```

**What It Actually Does:**
- ✅ Checks if color keywords appear in NFT name/description/collection name
- ✅ Checks if color keywords appear in image URL/filename (e.g., "green" in URL → +1 score)
- ✅ Basic heuristics (URL contains "ocean" + sentiment mentions "blue" → match)
- ❌ **Cannot** actually analyze image pixels, detect objects, or identify colors in artwork
- ❌ **No** computer vision API integration (OpenAI, Google Vision, etc.)
- ❌ **No** CV dependencies in package.json

### Proposal: Implement Real Computer Vision

Implement real computer vision to analyze actual NFT image content for objects, colors, and themes.

### Implementation Options

#### Option 1: OpenAI Vision API (Recommended)
- **Service**: GPT-4 Vision
- **Capabilities**: Advanced image understanding, contextual analysis, natural language descriptions
- **Pros**: Superior contextual understanding, integrates well with existing AI workflows
- **Cons**: Higher cost per request, rate limits

#### Option 2: Google Vision API
- **Service**: Google Cloud Vision API
- **Capabilities**: Object detection, color analysis, text detection
- **Pros**: Robust object detection, good color analysis, established service
- **Cons**: Requires Google Cloud setup, per-request pricing

### Implementation Plan

1. **Update MCP Server Tool** ([interpret-collection-sentiment.ts](mcp-server/src/tools/nft/interpret-collection-sentiment.ts))
   - Replace `analyzeVisualContent` function with real CV integration
   - Add environment variables for API keys
   - Implement error handling and fallback to current text-based approach

2. **Enhanced Scoring Algorithm**
   ```typescript
   interface VisualAnalysisResult {
     detectedObjects: string[];
     dominantColors: string[];
     visualThemes: string[];
     confidence: number;
     description?: string;
   }
   ```

3. **User Experience Improvements**
   - More accurate match explanations: "🎨 Visual: Apple detected in artwork"
   - Confidence scores for visual matches
   - Fallback messaging when visual analysis fails

---

## 🔧 Optimize Alchemy API Usage

### Status: ⚠️ BASIC CACHING IMPLEMENTED, Advanced Features Not Implemented

### Priority: Medium

**What's Implemented:**
- ✅ Redis-based caching system: [mcp-server/src/utils/cache.ts](mcp-server/src/utils/cache.ts)
- ✅ Upstash-compatible with TLS support
- ✅ Graceful fallback if Redis unavailable (3-second timeout)
- ✅ Per-tool TTL configuration (default 60s, sentiment analysis uses 5min)
- ✅ Pagination limits (max 2000 NFTs in sentiment analysis)
- ✅ Alchemy SDK used in both public-site and mcp-server

**What's NOT Implemented (Optimization Opportunities):**

#### 1. Enhanced Caching Strategy (NOT IMPLEMENTED)
- **Issue**: Current caching is per-tool with independent cache keys
- **Solution**: Implement cross-tool data sharing and longer cache periods for stable data
- **Impact**: Significantly reduce redundant API calls

#### 2. Request Batching & Deduplication (NOT IMPLEMENTED)
- **Issue**: Multiple tools make similar API calls independently
- **Solution**: Implement request batching and deduplication layer
- **Impact**: Reduce API quota usage and improve response times

#### 3. Smart Pagination (NOT IMPLEMENTED)
- **Issue**: Sentiment analysis tool can fetch up to 2000 NFTs per request (hardcoded)
- **Current**: Fixed pageSize: 100 with max 20 pages (interpret-collection-sentiment.ts:344)
- **Solution**: Implement smart stopping conditions based on collection diversity
- **Impact**: Reduce unnecessary large paginated requests

#### 4. Fallback Strategy (NOT IMPLEMENTED)
- **Issue**: Hard dependency on Alchemy for all NFT data
- **Solution**: Implement fallback to public RPC endpoints for basic data
- **Impact**: Better resilience and cost optimization

#### Locations
- [public-site/lib/web3.ts](public-site/lib/web3.ts:15-24) - RPC connections
- [public-site/lib/clients.ts](public-site/lib/clients.ts:8-11) - Alchemy SDK client
- [mcp-server/src/clients.ts](mcp-server/src/clients.ts:7-10) - MCP Alchemy client
- [mcp-server/src/tools/nft/](mcp-server/src/tools/nft/) - Various NFT tools

---

## 🎭 Origami Model Analysis & Enhancements

### Flower Pattern Selection Investigation

**Status**: ✅ Investigation Complete - No Issues Found

**Finding**: The "flower" model is being selected at expected frequency. Analysis of production logs shows flower appearing at 22% (2 out of 9 generations), which is above the expected 20% for 5 total patterns.

#### Pattern Selection Implementation

**Server-Side** ([katachi-generator/handlers/pattern.js:36-44](katachi-generator/handlers/pattern.js#L36-L44))
- Uses pure `Math.random()` for unbiased random selection
- All 5 patterns have equal 20% chance

**Client-Side** ([katachi-generator/src/template/partials/scripts/origami.ejs:131-173](katachi-generator/src/template/partials/scripts/origami.ejs#L131-L173))
- Uses Linear Congruential Generator (LCG) for deterministic randomness
- Based on `walletAddress + seed2` for consistent generation
- Still provides equal probability across all patterns

#### Available Patterns
1. **Traditional Crane** (`Crane`) - intermediate
2. **Paper Airplane** (`Airplane`) - beginner
3. **Geometric Pinwheel** (`Pinwheel`) - intermediate
4. **Hyperbolic Paraboloid** (`Hypar`) - expert
5. **Blooming Flower** (`Flower`) - intermediate, maxFolding: 70

#### Flower Pattern Specifics
- **SVG Source**: [FTpoly7.svg](katachi-generator/public/svgs/FTpoly7.svg) (~30KB, 2000+ lines)
- **Complexity**: 7-sided polygon base with mountain/valley folds
- **MaxFolding**: 70 (higher than other patterns)
- **Pattern Loading**: Embedded SVG → Blob URL → `globals.pattern.loadSVG()`

#### Production Distribution (9 generations)
```
Airplane:  3 (33%)
Flower:    2 (22%)  ← Above expected 20%
Crane:     2 (22%)
Pinwheel:  1 (11%)
Hypar:     1 (11%)
```

**Conclusion**: No technical issue. Small sample size creates perception bias. With larger samples (100+ generations), distribution should normalize to ~20% per pattern.

### Potential Future Enhancements

- [ ] **Pattern Distribution Tracking**
  - Add analytics to track actual pattern distribution over time
  - Display pattern statistics in admin dashboard
  - Monitor for any long-term selection biases

- [ ] **Pattern Preview System**
  - Add visual previews of each pattern type in UI
  - Allow users to optionally select preferred pattern
  - Maintain random selection as default

- [ ] **Pattern Complexity Weighting**
  - Consider weighting selection by user experience level
  - Beginners get more airplane/crane, advanced get more hypar/flower
  - Based on wallet activity or explicit user preference

- [ ] **New Pattern Types**
  - Research additional origami base patterns
  - Implement modular pattern addition system
  - Test with more complex curved fold patterns

---

## 🎨 UI/UX Improvements

### Status: ✅ IMPLEMENTED

### Countdown Text Update

**Status:** ✅ Implemented

- [x] **Change countdown text in public-site**
  - **Previous**: "Generating your Katachi Gen... {previewCountdown}s"
  - **Current**: "Revealing your Katachi Gen in... {previewCountdown}s"
  - **Locations updated**:
    - Line 1188: Mobile preview countdown display
    - Line 1249: Desktop preview countdown display
  - **Styling**: Changed background to black (`bg-black`) and text to white (`text-white`)

### Announcement Bar Update

**Status:** ✅ Implemented

- [x] **Update header announcement bar** ([layout.tsx:167-189](public-site/app/layout.tsx#L167-L189))
  - **Text**: "🥇 1ST PL WINNER, SHAPECRAFT² HACKATHON 🏆 Minting on mainnet soon 🚀"
  - **Links**:
    - "1ST PL WINNER" → <https://x.com/Shape_L2/status/1962942181271834826>
    - "SHAPECRAFT² HACKATHON" → <https://shape.network/shapecraft>

### Local Development Links

**Status:** ❌ Not Implemented (Backend provides URLs, Frontend doesn't display them)

- [ ] **Surface generated HTML and thumbnail file links in local dev mode**
  - **Goal**: Make it easy to access generated files during local development
  - **Backend Status**: Server DOES generate local URLs in dev mode ([pattern.js:101-103](katachi-generator/handlers/pattern.js#L101-L103))
  - **Frontend Status**: URLs returned in API response but NOT displayed in UI
  - **What's Missing**: Dev-only conditional rendering in katachi-generator.tsx
  - **Proposed Implementation**: Show clickable links when `NODE_ENV === 'development'`
  - **Files to display**:
    - HTML file URL (e.g., `http://localhost:3001/temp/html/kg_crane-...html`)
    - Thumbnail file URL (e.g., `http://localhost:3001/thumbnails/thumbnail_...png`)
  - **UI Addition**: Add dev-only section in generation success state:
    ```tsx
    {process.env.NODE_ENV === 'development' && (
      <div className="dev-files">
        <p>📁 Generated Files (Dev Mode)</p>
        <a href={result.htmlUrl} target="_blank">View HTML</a>
        <a href={result.thumbnailUrl} target="_blank">View Thumbnail</a>
      </div>
    )}
    ```
  - **Estimated time**: 15 minutes

---

## 📋 Backlog & Future Enhancements

### Interactive NFT Preview Improvements
- [ ] **Fix iframe sandbox restrictions for Interactive NFT Preview**
  - **Issue**: "Download is disallowed. The frame initiating or instantiating the download is sandboxed, but the flag 'allow-downloads' is not set."
  - **Location**: Generate and Mint step iframe in public-site
  - **Solution**: Add `allow-downloads` flag to iframe sandbox attribute
  - **Details**: https://www.chromestatus.com/feature/5706745674465280

### NFT Metadata Enrichment
- Cache and enrich NFT metadata with additional data sources
- Integrate with NFT marketplace APIs for rarity/value data

### Advanced Analytics Dashboard
- Historical sentiment analysis trends
- Collection growth insights
- Personal collecting behavior patterns

### Smart Collection Recommendations
- Suggest new NFTs based on collection sentiment patterns
- Cross-collection theme analysis
- Marketplace integration for purchase suggestions

### Documentation
- [ ] Add comprehensive EJS template system documentation
  - Template structure and component responsibilities
  - Data flow and compilation process
  - How to add new template components
  - Base64 embedding process
  - Self-contained HTML architecture

---

## ✅ Completed Features

### Core Generation System
- [x] **Modular EJS Template System** (FULLY IMPLEMENTED & OPERATIONAL)
  - Self-contained HTML generation with no external dependencies
  - Modular template structure in [katachi-generator/src/template/](katachi-generator/src/template/)
  - EJS partials system: head, body-content, ui-controls, patterns, scripts, styles
  - Template generator at [katachi-generator/utils/templateGenerator.js](katachi-generator/utils/templateGenerator.js)
  - Base64 image embedding for complete portability
  - Seeded randomness for deterministic generation
  - Texture mapping with NFT images applied to origami faces
  - Animation controls with slider-based folding
  - NFT display mode that hides navigation/controls for minting
  - R2 and Arweave uploads working correctly for both HTML and thumbnails

### File Cleanup

- [x] **Old Template File Removal**
  - Removed unused monolithic template files from [katachi-generator/public/](katachi-generator/public/)
  - Deleted `template.html` (1.7MB - old monolithic template)
  - Deleted `index-backup.html` (305KB)
  - Deleted `test.html` (24KB)
  - Total cleanup: ~2MB of unused files removed
  - Note: `generated-index.html` is still present as a generated output file (not tracked in git)

### Queue System

- [x] **Bull Queue with Redis for Concurrent Generation** (FULLY IMPLEMENTED & OPERATIONAL)
  - Bull queue implementation in [katachi-generator/queue/generationQueue.js](katachi-generator/queue/generationQueue.js)
  - Redis client utilities in [katachi-generator/utils/redis.js](katachi-generator/utils/redis.js)
  - Upstash Redis integration with TLS support
  - Real-time progress tracking with 8 granular steps during image processing
  - Job status polling endpoint: [public-site/app/api/job-status/route.ts](public-site/app/api/job-status/route.ts)
  - Frontend queue integration in [public-site/components/katachi-generator.tsx](public-site/components/katachi-generator.tsx)
  - Progress distribution: 8-82% images, 82-90% pattern generation, 90-100% uploads
  - Backend progress callbacks in [handlers/pattern.js](katachi-generator/handlers/pattern.js) and [image/processor.js](katachi-generator/image/processor.js)
  - Graceful fallback to direct processing if Redis unavailable
  - Job retry logic with exponential backoff
  - Concurrency control (processes 1 job at a time, configurable)
  - Job logs returned in status endpoint for real-time status messages
  - Dependencies: `bull`, `ioredis`, `uuid`

### Infrastructure & Deployment

- [x] **Vercel Monorepo Setup** (FULLY IMPLEMENTED & OPERATIONAL)
  - Root directory settings configured for both public-site and mcp-server projects
  - Ignored build step logic to prevent unnecessary rebuilds when other folders change
  - Environment variables properly exposed across projects
  - Related Projects linking configured (public-site ↔ mcp-server)
  - MCP server custom build command: `xmcp build --vercel`
  - MCP server keep-alive cron job (every 15 minutes)
  - Complete documentation in [VERCEL_SETUP.md](VERCEL_SETUP.md)
  - Optimized CI/CD with clear separation of app deployments
  - Reduced build minutes through selective rebuilding
