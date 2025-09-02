# TODO: Project Improvements

## 🚀 Vercel Monorepo Deployment Setup

### Priority: High
Configure Vercel to only redeploy specific folders when those folders are updated in the monorepo.

#### Current Issue
Vercel rebuilds the entire project on any commit, even when changes are only made to unrelated folders or files outside the `public-site/` directory.

#### Implementation Steps

1. **Configure Build Settings in Vercel Dashboard**
   - Go to Vercel dashboard → Select project → **Settings** → **Git**
   - Set **Root Directory** to `public-site/`
   - This tells Vercel where the app to deploy is located

2. **Create Build Detection Script**
   Create `scripts/ignore-build.js` in project root:
   ```javascript
   #!/usr/bin/env node
   const { execSync } = require('child_process');
   
   const appDir = process.env.VERCEL_PROJECT_SETTINGS_ROOT_DIRECTORY || 'public-site';
   
   try {
     const changedFiles = execSync('git diff HEAD^ HEAD --name-only', { 
       encoding: 'utf8' 
     }).split('\n').filter(Boolean);
   
     const hasChangesInApp = changedFiles.some(file => 
       file.startsWith(appDir + '/') || file === appDir
     );
   
     const hasSharedChanges = changedFiles.some(file => 
       file.startsWith('package.json') || 
       file.startsWith('package-lock.json') ||
       file.startsWith('shared/') ||
       file.startsWith('libs/')
     );
   
     if (hasChangesInApp || hasSharedChanges) {
       console.log(`✅ Changes detected - proceeding with build`);
       process.exit(1); // Build
     } else {
       console.log(`🛑 No relevant changes - skipping build`);
       process.exit(0); // Skip build
     }
   } catch (error) {
     console.log('⚠️ Error checking changes - proceeding with build');
     process.exit(1); // Build on error to be safe
   }
   ```

3. **Configure Ignored Build Step**
   - In Vercel dashboard → **Settings** → **Git**
   - Set **Ignored Build Step**: `node ../scripts/ignore-build.js`

4. **Alternative: Simple Bash Script**
   Create `ignore-build-step.sh` in project root:
   ```bash
   #!/bin/bash
   CURRENT_APP=$(basename "$VERCEL_PROJECT_SETTINGS_ROOT_DIRECTORY")
   
   if git diff HEAD^ HEAD --name-only | grep -q "^$CURRENT_APP/"; then
     echo "✅ Changes detected in $CURRENT_APP - proceeding with build"
     exit 1
   else
     echo "🛑 No changes in $CURRENT_APP - skipping build"
     exit 0
   fi
   ```

5. **Project Structure for Monorepo**
   ```
   katachi-gen/
   ├── public-site/           # Current Next.js app
   │   ├── vercel.json       # Optional app-specific config
   │   └── ...
   ├── admin-dashboard/       # Future app
   ├── shared/               # Shared components/utils
   ├── scripts/
   │   └── ignore-build.js   # Build detection script
   └── ignore-build-step.sh  # Alternative bash script
   ```

6. **Testing Checklist**
   - [ ] Deploy with changes only in `public-site/` (should build)
   - [ ] Deploy with changes only in other folders (should skip)
   - [ ] Deploy with package.json changes (should build)
   - [ ] Verify build logs show correct detection messages

#### Benefits
- **Faster deployments**: Only rebuild when necessary
- **Reduced build minutes**: Save on Vercel usage limits
- **Better CI/CD**: Clear separation of app deployments
- **Scalable**: Easy to add more apps to monorepo

#### Alternative Approaches
- **GitHub Actions**: Custom workflows to trigger Vercel deployments
- **Vercel CLI**: Manual deployment control with path checking
- **Multiple Vercel Projects**: Separate project per app folder

---

## 🎨 Enhanced Visual Analysis for NFT Collection Reflection

### Current Limitation
The MCP server's `interpretCollectionSentiment` tool currently cannot perform true visual analysis of NFT artwork. When users mention objects like "apples", "cats", "mountains", etc., the system only:

- ✅ Checks if the word appears in NFT name/description/collection name
- ✅ Analyzes image URL/filename for keyword hints
- ❌ **Cannot** actually detect objects, colors, or visual elements in the artwork

### Desired Enhancement
Implement real computer vision to analyze actual NFT image content for objects, colors, themes, and artistic elements.

### Implementation Options

#### Option 1: Google Vision API
- **Service**: Google Cloud Vision API
- **Capabilities**: Object detection, color analysis, text detection, safe search
- **Pros**: Robust object detection, good color analysis, established service
- **Cons**: Requires Google Cloud setup, per-request pricing

#### Option 2: OpenAI Vision API
- **Service**: OpenAI GPT-4 Vision (gpt-4-vision-preview)  
- **Capabilities**: Advanced image understanding, contextual analysis, natural language descriptions
- **Pros**: Superior contextual understanding, integrates well with existing AI workflows
- **Cons**: Higher cost per request, rate limits

### Technical Implementation Plan

1. **Update MCP Server Tool** (`/mcp-server/src/tools/nft/interpret-collection-sentiment.ts`)
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

3. **Configuration Updates**
   - Add API keys to environment variables
   - Update caching strategy for visual analysis results
   - Consider image size/format preprocessing

4. **User Experience Improvements**
   - More accurate match explanations: "🎨 Visual: Apple detected in artwork"
   - Confidence scores for visual matches
   - Fallback messaging when visual analysis fails

### Example Use Cases That Would Work

**User Input**: *"Collecting makes me feel connected to nature, especially pieces with apples"*

**Enhanced Results**:
- ✅ Text matches: NFTs with "apple" in metadata
- ✅ Theme matches: Nature-themed NFTs  
- ✅ **NEW**: NFTs with actual apple imagery detected via computer vision
- ✅ **NEW**: NFTs with green/red color schemes (actual color analysis)

**User Input**: *"I love vibrant, colorful art that makes me happy"*

**Enhanced Results**:
- ✅ **NEW**: NFTs with high color saturation and brightness
- ✅ **NEW**: NFTs with rainbow/multiple color schemes
- ✅ **NEW**: Visual vibrancy scoring based on actual image analysis

### Priority: High
This enhancement would significantly improve the accuracy and user satisfaction of the Collection Reflection feature, making it truly AI-powered rather than keyword-based.

---

## 🔧 Optimize Alchemy API Usage

### Current Usage Analysis
The codebase makes extensive use of the Alchemy API across multiple components. Here's a comprehensive breakdown of all Alchemy API calls:

#### Public Site (Frontend)
1. **`/public-site/lib/web3.ts:15-24`** - Wagmi transport configuration for RPC connections
   - Uses Alchemy RPC endpoints for Shape mainnet, Shape testnet, and Ethereum mainnet
   - URL pattern: `https://shape-mainnet.g.alchemy.com/v2/${config.alchemyKey}`

2. **`/public-site/lib/clients.ts:8-11`** - Alchemy SDK client initialization for NFT operations
   - Used for fetching NFT data with `new Alchemy()` constructor

3. **`/public-site/lib/clients.ts:19-21`** - RPC client function that creates viem public clients
   - Uses Alchemy RPC URLs for blockchain data reading

4. **`/public-site/app/api/mint-origami/route.ts:55`** - Contract interaction for getting next token ID
   - Creates RPC client using Alchemy endpoints for blockchain queries

5. **`/public-site/app/api/get-nfts/route.ts:34-36`** - NFT fetching API endpoint
   - Calls `alchemy.nft.getNftsForOwner()` to retrieve user's NFTs

#### MCP Server (Backend)
6. **`/mcp-server/src/clients.ts:7-10`** - Alchemy SDK client initialization for the MCP server
   - Similar to frontend but for backend NFT operations

7. **`/mcp-server/src/clients.ts:16-18`** - RPC client function in MCP server
   - Creates viem clients with Alchemy RPC URLs

8. **`/mcp-server/src/tools/nft/get-curated-nfts.ts:130-136`** - NFT curation tool
   - Calls `alchemy.nft.getNftsForOwner()` with pagination and filtering

9. **`/mcp-server/src/tools/nft/get-shape-nft.ts:116-124`** - NFT ownership data tool
   - Uses `alchemy.nft.getNftsForOwner()` for wallet NFT retrieval

10. **`/mcp-server/src/tools/nft/get-collection-analytics.ts:55-60`** - Collection analytics tool
    - Two Alchemy API calls:
      - `alchemy.nft.getNftsForContract()` - get collection NFTs
      - `alchemy.nft.getOwnersForContract()` - get collection owners

11. **`/mcp-server/src/tools/nft/interpret-collection-sentiment.ts:355-363`** - Sentiment analysis tool
    - Paginated calls to `alchemy.nft.getNftsForOwner()` to fetch all user NFTs

### Optimization Opportunities

#### 1. Rate Limiting & Request Batching
- **Issue**: Multiple tools make similar API calls independently
- **Solution**: Implement request batching and deduplication
- **Impact**: Reduce API quota usage and improve response times

#### 2. Enhanced Caching Strategy
- **Issue**: Current caching is per-tool with short TTLs
- **Solution**: Implement cross-tool data sharing and longer cache periods for stable data
- **Impact**: Significantly reduce redundant API calls

#### 3. Smart Pagination
- **Issue**: Sentiment analysis tool can fetch up to 2000 NFTs per request
- **Solution**: Implement smart stopping conditions based on collection diversity
- **Impact**: Reduce unnecessary large paginated requests

#### 4. API Key Management
- **Issue**: Using same Alchemy key across all services
- **Solution**: Consider dedicated keys per service with usage monitoring
- **Impact**: Better quota management and monitoring

#### 5. Fallback Strategy
- **Issue**: Hard dependency on Alchemy for all NFT data
- **Solution**: Implement fallback to public RPC endpoints for basic data
- **Impact**: Better resilience and cost optimization

### Implementation Priority
1. **High**: Implement request deduplication and enhanced caching
2. **Medium**: Smart pagination and rate limiting
3. **Low**: API key segregation and fallback strategies

---

## 🧩 Modularize Large HTML Template (template.html)

### Priority: High  
Current `template.html` file is 312KB (8,786 lines) and unmanageable for editing and maintenance.

#### Current Issues
- **File Size**: 312KB monolithic HTML file with inlined Bootstrap CSS, custom styles, and JavaScript
- **Maintainability**: 8,786 lines in single file makes edits difficult and error-prone
- **Developer Experience**: No syntax highlighting for embedded CSS/JS, poor IDE navigation
- **Version Control**: Massive diffs make code reviews and merge conflicts challenging
- **Collaboration**: Multiple developers can't work on different sections simultaneously

#### Current Usage Pattern
- Used in 4 locations: `handlers/pattern.js`, `image/thumbnail.js`, `image/thumbnail-puppeteer.js`, `image/thumbnail-html.js`
- Read via `fs.readFileSync()` and placeholder `___NFT_DATA_PLACEHOLDER___` replacement
- Webpack builds from `public/index.html` → `dist/template.html` with inlined assets
- Final output must be single self-contained HTML for Arweave blockchain storage

#### Recommended Solution: HTML Bundler Webpack Plugin + EJS Templates

**Why This Approach:**
- Minimal migration effort from current webpack setup
- Powerful templating with partials/includes system
- Maintains single-file output requirement for Arweave
- Preserves existing `___NFT_DATA_PLACEHOLDER___` workflow
- Works seamlessly with current asset inlining

#### Proposed File Structure
```
katachi-generator/
├── src/
│   ├── template/
│   │   ├── index.ejs                 // Main template file
│   │   ├── partials/
│   │   │   ├── head.ejs             // Meta tags, viewport  
│   │   │   ├── styles/
│   │   │   │   ├── bootstrap.ejs    // Bootstrap CSS (~200KB)
│   │   │   │   ├── custom.ejs       // Custom styles (~50KB)
│   │   │   │   └── animations.ejs   // Animation styles
│   │   │   ├── patterns/
│   │   │   │   ├── airplane.ejs     // Airplane SVG pattern
│   │   │   │   ├── crane.ejs        // Crane SVG pattern  
│   │   │   │   ├── hypar.ejs        // Hypar SVG pattern
│   │   │   │   ├── pinwheel.ejs     // Pinwheel SVG pattern
│   │   │   │   └── flower.ejs       // Flower SVG pattern
│   │   │   ├── scripts/
│   │   │   │   ├── three-setup.ejs  // Three.js initialization
│   │   │   │   ├── origami.ejs      // Origami rendering logic
│   │   │   │   └── interactions.ejs // User interactions
│   │   │   └── body-content.ejs     // Main HTML structure
```

#### Implementation Plan

**Phase 1: Setup (Week 1)**
1. Install `html-bundler-webpack-plugin`
2. Create basic EJS template structure
3. Update webpack configuration:
   ```javascript
   const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
   
   module.exports = {
     plugins: [
       new HtmlBundlerPlugin({
         entry: {
           template: './src/template/index.ejs',
         },
         js: { inline: true },  // Inline all JavaScript
         css: { inline: true }, // Inline all CSS  
         preprocessor: 'ejs',
         preprocessorOptions: {
           views: ['./src/template/partials'],
         },
         minify: false, // Keep readable for Arweave
       }),
     ],
   };
   ```
4. Test build output matches current template.html exactly

**Phase 2: Extract Styles (Week 2)**
1. Move Bootstrap CSS to `partials/styles/bootstrap.ejs` (~200KB reduction from main file)
2. Extract custom styles to `partials/styles/custom.ejs`  
3. Separate animation CSS to `partials/styles/animations.ejs`
4. Verify build output identical to original

**Phase 3: Modularize Scripts (Week 3)**  
1. Extract Three.js setup to `partials/scripts/three-setup.ejs`
2. Move origami logic to `partials/scripts/origami.ejs`
3. Separate interaction handlers to `partials/scripts/interactions.ejs`
4. Test all JavaScript functionality works identically

**Phase 4: Component Patterns (Week 4)**
1. Create individual pattern files for each SVG (5 files)
2. Build pattern loader system with EJS includes
3. Optimize and clean up final output
4. Performance test builds and runtime

#### Benefits
- **Maintainability**: 312KB file broken into ~20 manageable files (5-50KB each)
- **Developer Experience**: Proper syntax highlighting, better IDE support, faster navigation
- **Performance**: Faster incremental builds during development  
- **Collaboration**: Multiple developers can work on different components
- **Version Control**: Cleaner diffs, easier merge conflict resolution
- **Reusability**: Pattern components can be shared across templates
- **Preservation**: All existing server-side code continues working unchanged

#### Migration Risk Mitigation  
- **Backup Strategy**: Keep original template.html until fully migrated
- **Incremental Migration**: Move one section at a time with testing
- **Testing Protocol**: Compare output HTML byte-for-byte initially
- **Rollback Plan**: Webpack config can easily revert to original setup

#### Alternative Approaches Considered
| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|  
| **HTML Bundler + EJS** | Powerful, minimal migration, webpack integration | Learning EJS syntax | ✅ **Recommended** |
| **Enhanced HTML Loader** | Minimal changes, keeps current setup | Limited features, verbose syntax | Good fallback |
| **Vite Build System** | Very fast builds, modern tooling | Major migration, different ecosystem | Future consideration |
| **Handlebars Templates** | Popular, clean syntax | More setup required | Alternative to EJS |

#### Success Metrics
- [ ] Build time improved for incremental changes
- [ ] File sizes reduced from 312KB monolith to 5-50KB components  
- [ ] Developer editing time reduced by >50%
- [ ] Zero functionality regressions in final HTML output
- [ ] All existing server-side code works without changes

#### Next Steps
1. **This Week**: Install HTML Bundler plugin, create basic EJS structure
2. **Week 1**: Extract first partial (recommend styles - biggest impact)  
3. **Week 2-4**: Complete incremental migration following phase plan
4. **Ongoing**: Optimize component structure based on usage patterns

---

## Other Future Enhancements

### 🔄 NFT Metadata Enrichment
- Cache and enrich NFT metadata with additional data sources
- Integrate with NFT marketplace APIs for rarity/value data

### 📊 Advanced Analytics Dashboard  
- Historical sentiment analysis trends
- Collection growth insights
- Personal collecting behavior patterns

### 🤖 Smart Collection Recommendations
- Suggest new NFTs based on collection sentiment patterns
- Cross-collection theme analysis
- Marketplace integration for purchase suggestions