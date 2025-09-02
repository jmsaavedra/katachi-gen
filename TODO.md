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