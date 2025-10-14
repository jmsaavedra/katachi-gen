# TODO: Project Improvements

## 🚀 Vercel Monorepo Deployment Setup

### Status: ✅ Configuration Ready
Configure Vercel to only redeploy `public-site` when that folder is updated in the monorepo.

#### Current Situation
This monorepo doesn't use npm/yarn/pnpm workspaces, so Vercel's automatic build skipping won't work. Instead, use Vercel's built-in "Ignored Build Step" feature.

#### Implementation Steps (2 minutes)

**In Vercel Dashboard:**

1. **Settings → General → Root Directory**
   - Set to: `public-site`

2. **Settings → Git → Ignored Build Step**
   - Select: **"Only build if there are changes in public-site/"**
   - Or use custom command: `git diff HEAD^ HEAD --quiet -- public-site/`

3. **Settings → Environment Variables** (Optional but recommended)
   - Enable "Automatically expose System Environment Variables"

**That's it!** Changes to `katachi-generator/` or `mcp-server/` won't trigger rebuilds.

#### Documentation
See [VERCEL_SETUP.md](VERCEL_SETUP.md) for complete setup guide, testing instructions, and troubleshooting.

#### Benefits
- Faster deployments and reduced build minutes
- Better CI/CD with clear separation of app deployments
- No custom scripts needed - uses Vercel's built-in features

---

## 🎨 Enhanced Visual Analysis for NFT Collection Reflection

### Priority: High
Implement real computer vision to analyze actual NFT image content for objects, colors, and themes.

### Current Limitation
The MCP server's `interpretCollectionSentiment` tool currently cannot perform true visual analysis of NFT artwork. When users mention objects like "apples", "cats", "mountains", etc., the system only:

- ✅ Checks if the word appears in NFT name/description/collection name
- ✅ Analyzes image URL/filename for keyword hints
- ❌ **Cannot** actually detect objects, colors, or visual elements in the artwork

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

### Priority: Medium

The codebase makes extensive use of the Alchemy API across multiple components. Optimization opportunities:

#### 1. Enhanced Caching Strategy (HIGH PRIORITY)
- **Issue**: Current caching is per-tool with short TTLs
- **Solution**: Implement cross-tool data sharing and longer cache periods for stable data
- **Impact**: Significantly reduce redundant API calls

#### 2. Request Batching & Deduplication
- **Issue**: Multiple tools make similar API calls independently
- **Solution**: Implement request batching and deduplication layer
- **Impact**: Reduce API quota usage and improve response times

#### 3. Smart Pagination
- **Issue**: Sentiment analysis tool can fetch up to 2000 NFTs per request
- **Solution**: Implement smart stopping conditions based on collection diversity
- **Impact**: Reduce unnecessary large paginated requests

#### 4. Fallback Strategy (LOW PRIORITY)
- **Issue**: Hard dependency on Alchemy for all NFT data
- **Solution**: Implement fallback to public RPC endpoints for basic data
- **Impact**: Better resilience and cost optimization

#### Locations
- [public-site/lib/web3.ts](public-site/lib/web3.ts:15-24) - RPC connections
- [public-site/lib/clients.ts](public-site/lib/clients.ts:8-11) - Alchemy SDK client
- [mcp-server/src/clients.ts](mcp-server/src/clients.ts:7-10) - MCP Alchemy client
- [mcp-server/src/tools/nft/](mcp-server/src/tools/nft/) - Various NFT tools

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
