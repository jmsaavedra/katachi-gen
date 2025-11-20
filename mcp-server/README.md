# Katachi Gen MCP Server

Model Context Protocol (MCP) server for [Katachi Gen](https://katachi-gen.vercel.app), built with [xmcp](https://xmcp.dev). This server powers the AI-driven sentiment analysis and NFT curation system that transforms collectors' emotional responses into generative origami art.

**Based on the [Shape MCP Server](https://github.com/shape-network/mcp-server) by [@williamhzo](https://x.com/williamhzo)**

## What is Katachi Gen?

Katachi Gen is an experimental on-chain art generator that:
1. **Collects Sentiment**: Asks collectors how Shape makes them feel
2. **Extracts Themes**: Uses AI to generate 2-5 curatorial themes from their response
3. **Curates NFTs**: Scores and selects NFTs from their wallet that match the themes
4. **Generates Art**: Creates a unique generative origami design based on their curated collection
5. **Mints On-Chain**: Deploys the artwork as an SVG NFT on Shape

This MCP server handles steps 2-3: the AI-powered sentiment interpretation and NFT curation pipeline.

## Core Features

### 🎨 AI Sentiment Interpretation
- **Generative Theme Extraction**: Uses Claude 3.5 Haiku to generate contextually appropriate curatorial themes
- **Two-Tool Architecture**: Fast theme extraction (~2-5s) followed by heavy NFT curation (~10-30s)
- **Art Curatorial Focus**: Themes are rooted in gallery practice, artistic movements, and collector psychology
- **Smart Scoring**: Multi-factor algorithm matches NFTs to themes based on metadata, visual characteristics, and collection diversity

### 🖼️ NFT Tools
- **9 specialized tools** for NFT analysis, curation, and minting
- **Alchemy Integration** for comprehensive NFT metadata
- **Blocked Contracts** filtering to exclude spam collections
- **5-minute caching** for repeat requests

### ⛓️ Shape Network Integration
- **Gasback Analytics** - Track creator earnings and simulate rewards
- **Stack Achievements** - Monitor user progress in Shape's ecosystem
- **Network Monitoring** - Chain health, gas prices, RPC status

## Available Tools

### NFT Curation Tools (`/tools/nft/`)

The heart of Katachi Gen's sentiment interpretation system.

#### `extractSentimentThemes` ⚡ (NEW)

**Fast AI-powered theme extraction** (~2-5s) that analyzes collector sentiment and generates 2-5 contextually appropriate curatorial themes without requiring NFT data. This is the first step in the sentiment interpretation pipeline.

**Key Features:**
- **Generative Themes**: Uses Claude 3.5 Haiku to generate unique themes based on user input
- **Art Curatorial Focus**: Themes are centered around art curatorial practice (gallery exhibitions, artistic movements, collector psychology)
- **Broad & Precise**: Can be emotional, practical, aesthetic, or conceptual - always contextually appropriate
- **Fast Response**: No NFT fetching required, returns initial interpretation immediately
- **Fallback System**: Keyword-based theme extraction if AI fails

**AI Prompt Used:**
```
You are an expert art curator analyzing a collector's emotional response to their NFT collecting experience.

User's sentiment: "${sentiment}"

Generate 2-5 curatorial themes that capture the essence of this sentiment. These themes should be:
- Contextually appropriate to what the user actually expressed
- Broad and generative - they can be emotional, practical, aesthetic, conceptual, or anything relevant
- Centered around art curatorial practice (think gallery exhibitions, artistic movements, collector psychology)
- Precise and evocative - not generic

Examples of good themes:
- For "profits and money": ["financial speculation", "investment mindset", "wealth accumulation"]
- For "connected to community": ["social connection", "collective identity", "participatory culture"]
- For "beautiful colors": ["chromatic exploration", "visual aesthetics", "color theory"]
- For "early adopter": ["technological pioneering", "cultural vanguard", "risk-taking"]

Instructions:
- Generate between 2-5 themes that genuinely match the sentiment
- Each theme should be 1-4 words (short but meaningful)
- Avoid forcing positive interpretations if the sentiment isn't positive
- Return ONLY a JSON array of theme strings, nothing else

Response format: ["theme one", "theme two", "theme three"]
```

**Example Theme Generation:**
- Input: *"profits and money"* → `["financial speculation", "investment mindset", "wealth accumulation"]`
- Input: *"connected to community"* → `["social connection", "collective identity", "participatory culture"]`
- Input: *"beautiful colors"* → `["chromatic exploration", "visual aesthetics", "color theory"]`
- Input: *"early adopter"* → `["technological pioneering", "cultural vanguard", "risk-taking"]`

**Output Format:**
```json
{
  "sentiment": "user's original input",
  "themes": ["theme one", "theme two", "theme three"],
  "interpretation": "AI-generated curatorial statement with <span> styled themes",
  "timestamp": "ISO 8601 timestamp"
}
```

**Caching:** 5-minute TTL for fast repeated requests

---

#### `curateNftsByThemes` 🎯 (NEW)

**Heavy NFT curation tool** (~10-30s) that takes generated themes and curates NFTs from the collector's wallet. This is the second step in the sentiment interpretation pipeline, called after `extractSentimentThemes`.

**Key Features:**
- **Single NFT Fetch**: Fetches entire collection from Alchemy once (up to 2000 NFTs for performance)
- **Theme-Based Scoring**: Scores NFTs against AI-generated themes from step 1
- **Final Interpretation**: Generates curatorial statement that references specific NFT names
- **Collection Diversity**: Maximum 1 NFT per collection to ensure variety
- **Comprehensive Match Details**: Returns detailed reasoning for each selected NFT

**Input Parameters:**
- `address`: Wallet address to analyze
- `themes`: Array of themes from `extractSentimentThemes`
- `sentiment`: Original user sentiment text
- `count`: Number of NFTs to curate (typically 8)

**Scoring Algorithm:**

Each NFT receives a composite score based on:

**Text Matching (Highest Priority)**
- **NFT Name Match**: +3 points per word
- **NFT Description Match**: +2 points per word
- **Collection Name Match**: +1 point per word
- Only processes words longer than 3 characters

**Theme Matching (Medium Priority)**
- Splits multi-word themes into individual words for matching
- **Name Theme Match**: +2 points (e.g., "financial" theme matches "Finance Punk" NFT)
- **Description Theme Match**: +1 point
- **Collection Theme Match**: +0.5 points

**Visual/Mood Matching (Lower Priority)**
- **Positive Sentiment + Bright Visuals**: +1 point
- **Calm Sentiment + Minimal Style**: +1 point

**AI Prompt Used for Final Interpretation:**
```
You are an expert art curator writing a personalized interpretation of a collector's NFT collection based on their sentiment.

Collector's sentiment: "${sentiment}"

Identified curatorial themes: ${themes.join(', ')}

Top artworks selected (in order of relevance):
${nftDetails.map((nft, i) => `${i + 1}. "${nft.title}" from ${nft.collection}`).join('\n')}

Write a 2-3 sentence curatorial statement that:
- Addresses the collector's sentiment directly and authentically (whether it's emotional, practical, critical, or anything else)
- References the themes in a sophisticated, yet relatable, accessible and unpretentious art-world tone
- Mentions 1-2 of the top artworks by name (use <em> tags for titles)
- Uses HTML <span style="color: #3b82f6;"> tags to highlight the theme words when you mention them
- Ends by noting these are the works curated for their Katachi Gen origami design
- Avoids clichés like "journey" or "resonates" - be specific and direct
- Matches the tone of the sentiment (e.g., if they mention money, acknowledge the financial aspect; if they're poetic, be poetic)

Example for "profits and money" with themes ["financial speculation", "investment mindset"]:
"Your collection reflects a clear <span style="color: #3b82f6;">investment mindset</span>, treating on-chain art as both cultural capital and <span style="color: #3b82f6;">financial speculation</span>. Works like <em>Ethereum Bull</em> and <em>Crypto Punk #1234</em> demonstrate strategic acquisition patterns typical of collector-investors. These pieces will form the basis of your Katachi Gen origami design."

Example for "beautiful colors" with themes ["chromatic exploration", "visual aesthetics"]:
"Your focus on <span style="color: #3b82f6;">chromatic exploration</span> reveals a collector drawn to <span style="color: #3b82f6;">visual aesthetics</span> above conceptual concerns. <em>Rainbow Gradient</em> and <em>Color Field Study</em> exemplify your preference for vibrant, color-forward compositions. These works will form the basis of your Katachi Gen origami design."

Write ONLY the curatorial statement, no introduction or explanation:
```

**Output Format:**
```json
{
  "themes": ["theme one", "theme two"],
  "interpretation": "Final curatorial statement with <em> NFT titles and <span> styled themes",
  "requestedCount": 8,
  "selectedNfts": [
    {
      "tokenId": "123",
      "contractAddress": "0x...",
      "name": "NFT Name",
      "imageUrl": "https://...",
      "matchScore": 8.5,
      "reason": "Human-readable match explanation",
      "matchDetails": {
        "textMatches": ["word matches"],
        "themeMatches": ["theme connections"],
        "visualMatches": ["aesthetic analysis"],
        "collectionInfo": "Collection Name"
      }
    }
  ]
}
```

**Blocked Contracts:** Filters out NFTs from contract addresses listed in `blocked-contracts.txt`

**Caching:** 5-minute TTL keyed by address + themes + sentiment + count

---

#### `interpretCollectionSentiment` 📦 (LEGACY)

**Note:** This is the original monolithic tool that combined theme extraction and NFT curation in a single call. It remains available for backward compatibility but the new 2-tool architecture (`extractSentimentThemes` → `curateNftsByThemes`) provides better UX with progressive loading states.

AI-powered NFT curation that matches collector sentiment to their owned NFTs. Users express their emotional connection to collecting, and the system returns curated NFTs through advanced scoring algorithms.

**Current Limitations:**
- Visual analysis is text-based (URL/filename parsing) rather than actual image pixel analysis
- Cannot detect objects in artwork (e.g., "apple" mentioned but can't see actual apples in images)
- Color detection relies on metadata/filenames rather than true color analysis

**Example Scoring:**
User Input: *"Collecting makes me feel peaceful and connected to nature"*
- NFT "Zen Garden #42" with green trees in description:
  - Text match "peaceful": +3 points
  - Theme match "nature": +2 points
  - Description match "connected": +2 points
  - **Total: 7+ points**

---

#### Other NFT Tools

##### `getShapeNft`
List NFTs for an address, with metadata and pagination support. Returns up to 100 NFTs per page.

##### `getCollectionAnalytics`
Collection stats: supply, owners, sample NFTs, floor prices, etc.

##### `getCuratedNfts`
Get previously curated NFTs for a wallet (used for Katachi Gen origami generation)

##### `getNftWithRaribleImages`
Fetch NFT metadata with Rarible image CDN URLs for better image loading

##### `prepareMintSvgNft`
Prepare SVG artwork for minting as an NFT on Shape

##### `setTokenUri`
Update token URI for minted NFTs (admin function)

### Gasback Tools (`/tools/gasback/`)

#### `getShapeCreatorAnalytics`

Shape builder/creator deep dive: earnings, tokens, withdrawals, etc.

Example prompt: "analyze creator 0xabcd...123's gasback and compare to top earners. any tips?"

#### `getTopShapeCreators`

Top creators by gasback earned & tx.

Example prompt: "who are shape's top 10 gasback earners?"

#### `simulateGasbackRewards`

Get gasback rough estimates.

Example prompt: "simulate 50 txs/day at 50k gas—earnings over 3 months? wen lambo?"

### 🏗️ Stack Tools (`/tools/stack/`)

#### `getStackAchievements`

User medals by tier, total count, etc.

Example prompt: "what's 0xghi...123's stack status? gold medals?"

### Network Tools (`/tools/network/`)

#### `getChainStatus`

Monitor Shape's network: RPC health, gas prices, block times, etc.

Example prompt: "current shape status? gas prices looking mint-friendly?"

## Prerequisites

- Node.js 18+ and yarn
- Alchemy API key for NFT queries (get one [here](https://dashboard.alchemy.com/))
- Anthropic API key for AI curation (get one [here](https://console.anthropic.com/))
- Optional: Redis for caching (speeds up RPC-heavy tools)

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in:

```bash
# Required
ALCHEMY_API_KEY=your_alchemy_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
CHAIN_ID=360  # Mainnet; use 11011 for Sepolia

# Optional caching
REDIS_URL=redis://localhost:6379  # Local, or Upstash for prod
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Run Locally

```bash
yarn dev
```

Server is now running at `http://localhost:3002/mcp`

## 🔌 Client Integration

### MCP Settings

Add to your MCP settings in Cursor or Claude Desktop:

```json
{
  "mcpServers": {
    "katachi-gen-mcp": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

## Project Structure

```
src/
├── tools/                  # Modular tools
│   ├── gasback/           # Gasback analytics & rewards
│   ├── market/            # Market data & collection stats
│   ├── network/           # Chain status & health
│   ├── nft/               # NFT analysis & curation (9 tools)
│   │   ├── extract-sentiment-themes.ts     # AI theme extraction (NEW)
│   │   ├── curate-nfts-by-themes.ts        # NFT curation by themes (NEW)
│   │   ├── interpret-collection-sentiment.ts  # Legacy monolithic tool
│   │   ├── get-shape-nft.ts                # List wallet NFTs
│   │   ├── get-collection-analytics.ts     # Collection stats
│   │   ├── get-curated-nfts.ts             # Retrieve curated NFTs
│   │   ├── get-nft-with-rarible-images.ts  # NFT with Rarible CDN
│   │   ├── prepare-mint-svg-nft.ts         # SVG minting prep
│   │   └── set-token-uri.ts                # Update token URIs
│   └── stack/             # Stack achievements
├── abi/                   # Contract interfaces
├── prompts/               # Reusable AI prompts
├── resources/             # Static resources & configs
├── utils/                 # Helpers (cache.ts, collection-config.ts)
├── addresses.ts           # Key contracts addys
├── clients.ts             # RPC/Alchemy/Redis/Anthropic
├── config.ts              # Env-based setup
├── middleware.ts          # Auth/logging if needed
├── types.ts               # Shared outputs
└── xmcp.config.ts         # xmcp server config
blocked-contracts.txt      # List of NFT contracts to filter out
```

Categories keep things modular. Add a tool to `/tools/nft/` and xmcp auto-picks it up. No monolith mess.

## Adding New Tools

1. Pick a category folder (e.g., `/tools/nft/`)
2. New `.ts` file with schema, metadata, function
3. Example:

```ts
import { z } from 'zod';
import { type InferSchema } from 'xmcp';

export const schema = {
  address: z.string().describe('Wallet to analyze'),
};

export const metadata = {
  name: 'myTool',
  description: 'Custom tool for fun insights',
  annotations: {
    title: 'My Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft',
    chainableWith: ['getShapeNft'],
  },
};

export default async function myTool({ address }: InferSchema<typeof schema>) {
  // Logic here
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}
```

## Caching (Optional)

Redis cuts RPC load for repeat calls. Set `REDIS_URL` to your instance (Vercel KV or Upstash). Skip it? Tools run direct, no sweat. See `cache.ts` for the simple get/set logic.

## Resources

- [Katachi Gen](https://katachi-gen.vercel.app)
- [Shape Docs](https://docs.shape.network/)
- [Shape MCP Server (Original)](https://github.com/shape-network/mcp-server) by [@williamhzo](https://x.com/williamhzo)
- [xmcp Framework](https://xmcp.dev/docs)
- [Alchemy Docs](https://docs.alchemy.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)

## Credits

Built on top of the excellent [Shape MCP Server](https://github.com/shape-network/mcp-server) by [@williamhzo](https://x.com/williamhzo).

Extended with AI sentiment interpretation tools for Katachi Gen by [@jmsaavedra](https://github.com/jmsaavedra).

---

MIT LICENSE - [See LICENSE](./LICENSE)
