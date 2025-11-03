# TODO: Project Improvements

## Implementation Status Summary

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Queue System (Bull/Redis) | ❌ Not Implemented | HIGH | Proposal only - no code implemented |
| Vercel Monorepo Setup | ⚠️ Partial | Medium | Config files exist, dashboard setup required |
| Visual Analysis (CV/AI) | ❌ Not Implemented | High | Placeholder only - text matching only |
| Alchemy Caching | ✅ Basic Implementation | Medium | Redis cache working, no batching |
| Origami Patterns | ✅ Implemented | - | All 5 patterns working correctly |
| Collection maxCount | ❌ Not Implemented | Low | Hardcoded to 2 per collection |
| UI Countdown Text | ❌ Not Implemented | Low | Still shows old text |
| Dev Mode File Links | ❌ Not Implemented | Low | URLs exist but not displayed |

---

## 🔄 Queue System for Concurrent Generation Requests

### Status: ❌ NOT IMPLEMENTED - Proposal Only

### Priority: HIGH (Pre-Launch Critical)

### Current Problem
The katachi-generator service has **no concurrency handling**, which creates serious issues with multiple simultaneous users:

**Issues with Current Architecture:**
1. **No Queue** - All requests processed immediately in parallel
2. **Shared Resources** - Same temp directories, Arweave wallet, Puppeteer instance
3. **Race Conditions** - File naming collisions, temp file cleanup conflicts
4. **Resource Exhaustion** - Each generation uses ~200MB+ memory + Puppeteer browser
   - 5 concurrent users = 1GB+ memory spike + 5 browser instances
5. **No Job Tracking** - Cannot show real progress per user
6. **Logs Intermixed** - All user logs mixed together in console

### Recommended Solution: Bull Queue System

**Why Bull Queue:**
- Battle-tested for production workloads
- Built-in Redis persistence
- Real progress tracking (`job.progress()`)
- Automatic retry logic
- Job status dashboard available
- Works well with serverless (can offload to separate worker)

### Implementation Plan

#### Phase 1: Basic Queue Setup (2-3 hours)
```javascript
// katachi-generator/queue/generator-queue.js
const Queue = require('bull');
const Redis = require('ioredis');

const generationQueue = new Queue('katachi-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  settings: {
    maxStalledCount: 1,
    lockDuration: 180000, // 3 minutes
  }
});

// Process one job at a time (or configure concurrency)
generationQueue.process(1, async (job) => {
  const { walletAddress, images, pattern, seed2 } = job.data;

  // Update progress at key steps
  await job.progress(10); // Starting
  await job.progress(30); // Images processed
  await job.progress(60); // Pattern generated
  await job.progress(80); // Thumbnail created
  await job.progress(90); // Uploading

  const result = await generatePattern(job.data);

  await job.progress(100); // Complete
  return result;
});
```

#### Phase 2: API Updates (1-2 hours)
```javascript
// New endpoint: POST / → Returns job ID immediately
POST /
Response: { jobId: 'uuid-123', status: 'queued' }

// New endpoint: GET /job-status/:jobId
GET /job-status/uuid-123
Response: {
  status: 'processing',
  progress: 45,
  message: 'Processing image 4/8...'
}

// Result endpoint: GET /job-result/:jobId
GET /job-result/uuid-123
Response: {
  status: 'completed',
  htmlUrl: '...',
  thumbnailUrl: '...',
  arweaveId: '...'
}
```

#### Phase 3: Frontend Updates (2 hours)
```typescript
// public-site/app/api/generate-katachi/route.ts
export async function POST(request: NextRequest) {
  // Submit job to queue
  const { jobId } = await fetch(GENERATOR_URL, { ... });

  // Start polling for progress
  const pollInterval = setInterval(async () => {
    const status = await fetch(`${GENERATOR_URL}/job-status/${jobId}`);

    if (status.progress) {
      setGenerationProgress(status.progress);
      setGenerationStatus(status.message);
    }

    if (status.status === 'completed') {
      clearInterval(pollInterval);
      // Get final result
    }
  }, 2000); // Poll every 2 seconds
}
```

#### Phase 4: Benefits We Get
- ✅ **Real Progress** - Actual server-side progress updates
- ✅ **Concurrency Control** - Configure max concurrent jobs (e.g., 3)
- ✅ **Better UX** - Users see exactly what's happening
- ✅ **Resilience** - Jobs survive server restarts (Redis persistence)
- ✅ **Job History** - Can query past jobs
- ✅ **Failed Job Retry** - Automatic or manual retry
- ✅ **Launch Day Ready** - Handle traffic spikes gracefully

### Infrastructure Requirements
- **Redis** - Can use Railway.app free tier or Upstash
- **Environment Variables** - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Optional** - Bull Board for visual job monitoring

### Deployment Strategy
1. **Development**: Use local Redis (Docker or native)
2. **Production**: Railway/Upstash Redis
3. **Monitoring**: Bull Board dashboard at `/admin/queues`

### Estimated Timeline
- Phase 1: 2-3 hours (queue setup)
- Phase 2: 1-2 hours (API changes)
- Phase 3: 2 hours (frontend polling)
- Testing: 1-2 hours
- **Total: 1 day of focused work**

### Alternative: Simple In-Memory Queue (Temporary Solution)
If Redis is not an option immediately, implement a simple in-memory queue:
- Limit to 1-2 concurrent jobs
- Jobs lost on restart (acceptable for MVP)
- Still provides progress tracking within same server instance
- Can migrate to Bull/Redis later without changing frontend

---

## 🚀 Vercel Monorepo Deployment Setup

### Status: ⚠️ PARTIALLY IMPLEMENTED

**What's Done:**
- ✅ `vercel.json` files exist for both projects
- ✅ Related Projects linking configured (public-site ↔ mcp-server)
- ✅ MCP server has custom build command: `xmcp build --vercel`
- ✅ MCP server has keep-alive cron job (every 15 minutes)
- ✅ Documentation exists: [VERCEL_SETUP.md](VERCEL_SETUP.md)

**What's Required (Manual Dashboard Setup):**

Configure Vercel to only redeploy `public-site` when that folder is updated in the monorepo.

#### Implementation Steps (2 minutes per project)

**In Vercel Dashboard:**

1. **Settings → General → Root Directory**
   - Set to: `public-site` (for public-site project)
   - Set to: `mcp-server` (for mcp-server project)

2. **Settings → Git → Ignored Build Step**
   - For public-site: `git diff HEAD^ HEAD --quiet -- public-site/`
   - For mcp-server: `git diff HEAD^ HEAD --quiet -- mcp-server/`
   - This prevents rebuilds when only other folders change

3. **Settings → Environment Variables** (Optional but recommended)
   - Enable "Automatically expose System Environment Variables"

**Note:** These settings CANNOT be configured via vercel.json and must be set manually in the dashboard.

#### Documentation
See [VERCEL_SETUP.md](VERCEL_SETUP.md) for complete setup guide, testing instructions, and troubleshooting.

#### Benefits
- Faster deployments and reduced build minutes
- Better CI/CD with clear separation of app deployments
- No custom scripts needed - uses Vercel's built-in features

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

### Status: ❌ NOT IMPLEMENTED

### Countdown Text Update

**Status:** ❌ Not Implemented

- [ ] **Change countdown text in public-site**
  - **Current**: "Generating your Katachi Gen... {previewCountdown}s" ([katachi-generator.tsx:1099, 1160](public-site/components/katachi-generator.tsx#L1099))
  - **Desired**: "Revealing your Katachi Gen in... 5s"
  - **Locations to update**:
    - Line 1099: Preview countdown display
    - Line 1160: Alternative countdown display
  - **Change**: Update both instances to use "Revealing your Katachi Gen in..." format
  - **Estimated time**: 2 minutes

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

## 🔧 MCP Server Collection Configuration

### Status: ❌ NOT IMPLEMENTED

### maxCount per Collection

**Current Implementation:** Hardcoded to 2 NFTs per collection ([interpret-collection-sentiment.ts:420](mcp-server/src/tools/nft/interpret-collection-sentiment.ts#L420))

- [ ] **Add 'maxCount' key to imagePreferences array items in config-collections.json**
  - **Current**: Default is 2 max NFTs per collection globally (hardcoded)
  - **Goal**: Allow per-collection customization of max NFT count
  - **Priority**: Low
  - **Current imagePreferences structure**:

    ```json
    "imagePreferences": [
      {
        "address": "0xF2E4b2a15872a20D0fFB336a89B94BA782cE9Ba5",
        "name": "DeePle",
        "preferOriginal": false,
        "reason": "Use Alchemy CDN thumbnails instead of slow IPFS gateway originals"
      }
    ]
    ```

  - **Proposed addition**:

    ```json
    "imagePreferences": [
      {
        "address": "0xF2E4b2a15872a20D0fFB336a89B94BA782cE9Ba5",
        "name": "DeePle",
        "preferOriginal": false,
        "maxCount": 1,  // ← NEW: max NFTs from this collection
        "reason": "Use Alchemy CDN thumbnails instead of slow IPFS gateway originals"
      }
    ]
    ```

  - **Use Case**: Some collections should only contribute 1 NFT max to avoid over-representation
  - **File**: [mcp-server/config-collections.json](mcp-server/config-collections.json)
  - **Code Update**: [get-curated-nfts.ts](mcp-server/src/tools/nft/get-curated-nfts.ts) - respect maxCount when selecting NFTs per collection (default to 2 if not specified)

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
