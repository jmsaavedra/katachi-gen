# Shape MCP Server

Model Context Protocol (MCP) server for Shape, built with [xmcp](https://xmcp.dev). This server provides AI assistants access to Shape's onchain data: [gasback](https://docs.shape.network/gasback) distribution, collections analytics, stack users & more.

Contributions are welcome! Fork and add your own tools, feel free to submit a PR.

Check our docs about how to build AI on Shape: https://docs.shape.network/building-on-shape/ai

## Features

Organized by functionality for easy extension:

- **Gasback Analytics** - Track creator earnings, top performers, and simulate gasback earned
- **NFT Analysis** - Collections and ownership
- **Stack Achievements** - Monitor user progress in Shape's [Stack](https://stack.shape.network) ecosystem
- **Network Monitoring** - Chain health, metrics, RPC URLs, etc
- **AI Ready** - Tools are optimized for agent chaining and automation
- **Caching** - Optional Redis for snappier responses & less load on RPCs, no lock-in required

## Available Tools

### Network Tools (`/tools/network/`)

#### `getChainStatus`

Monitor Shape's network: RPC health, gas prices, block times, etc.

Example prompt: "current shape status? gas prices looking mint-friendly?"

### NFT Tools (`/tools/nft/`)

#### `getCollectionAnalytics`

Collection stats: supply, owners, sample NFTs, floors, etc.

Example prompt: "what's the vibe on collection 0x567...abc? floor price and top holders?"

#### `getShapeNft`

List NFTs for an address, with metadata and pagination support. Returns up to 100 NFTs per page.

Example prompts:

- "what NFTs does 0xabcd...123 hold on shape?"
- "get the first 50 NFTs for wallet 0xabcd...123"
- "get the next page of NFTs using pageKey xyz..."

#### `interpretCollectionSentiment`

AI-powered NFT curation that matches collector sentiment to their owned NFTs. Users express their emotional connection to collecting, and the system returns 5-15 NFTs that best match their feelings through advanced scoring algorithms.

Example prompts:
- "I feel connected to nature when I collect - show me 10 NFTs that match this sentiment"
- "Collecting makes me feel creative and inspired - find 5 pieces from my collection"

**How the Sentiment Interpretation Algorithm Works:**

The system uses a multi-layered scoring approach to match user sentiment with NFT metadata:

**1. Emotional Theme Detection (Lines 72-83)**
- Recognizes 10 core emotional categories with keyword triggers:
  - **Joy**: happy, excited, joyful, delighted, thrilled, elated, cheerful, bright, fun, playful
  - **Pride**: proud, accomplished, achievement, success, confident, strong, powerful, winner
  - **Community**: together, community, friends, family, connected, belong, unity, collective, group
  - **Creativity**: creative, artistic, inspired, innovative, unique, original, imaginative, expressive
  - **Peace**: calm, peaceful, serene, tranquil, relaxed, zen, meditative, quiet, still
  - **Nostalgia**: memory, remember, nostalgic, past, childhood, vintage, classic, timeless, old
  - **Adventure**: adventure, explore, discover, journey, quest, travel, new, exciting, bold
  - **Wealth**: rich, wealthy, valuable, precious, treasure, gold, diamond, luxury, premium
  - **Nature**: nature, earth, forest, ocean, mountain, sky, flower, animal, natural, organic
  - **Technology**: tech, digital, cyber, future, ai, robot, code, pixel, virtual, meta

**2. Visual Characteristic Mapping (Lines 86-108)**
- Maps emotional tones to visual styles and 11 color categories
- **Bright**: yellow, orange, pink, neon, light, bright, vivid, glow
- **Dark**: black, dark, shadow, night, gothic, noir, mysterious
- **Color Detection**: Comprehensive keyword mapping for red, blue, green, yellow, purple, orange, pink, white, black, gray, brown

**3. NFT Scoring Algorithm (Lines 187-300)**

Each NFT receives a composite score based on multiple factors:

**Text Matching (Highest Priority)**
- Direct word matches between user sentiment and NFT metadata
- **NFT Name Match**: +3 points per word (e.g., "happy" in user input matches "Happy Cat #123")
- **NFT Description Match**: +2 points per word
- **Collection Name Match**: +1 point per word
- Only processes words longer than 3 characters to avoid noise

**Theme Matching (Medium Priority)**
- Detected themes are cross-referenced with NFT metadata
- **Name Theme Match**: +2 points (e.g., "nature" theme matches "Forest Spirit" NFT)
- **Description Theme Match**: +1 point
- Tracks specific keyword matches for detailed explanations

**Visual/Mood Matching (Lower Priority)**
- **Positive Sentiment + Bright Visuals**: +1 point (happy/excited + bright/colorful NFT names)
- **Calm Sentiment + Minimal Style**: +1 point (peaceful + minimal/simple NFT characteristics)

**Color Analysis (Experimental)**
- Extracts color mentions from sentiment text
- Attempts to match with NFT image URLs/filenames (heuristic-based)
- **Color Match**: +1-2 points plus detailed reasoning
- **Note**: Currently limited to URL/filename analysis, not actual image pixel analysis

**Collection Diversity Bonus**
- **Multiple Ownership**: +0.5 points if user owns multiple NFTs from same collection
- **Randomization Factor**: +0-0.5 random points to ensure variety when scores are similar

**4. Selection Process**
1. **Score All NFTs**: Every owned NFT (up to 500 for performance) gets scored against sentiment
2. **Sort by Score**: Highest scoring NFTs bubble to the top
3. **Unique Collections**: Maximum 1 NFT per collection address to ensure diversity
4. **Return Top N**: User-specified count (5, 10, or 15 NFTs)

**5. Match Details Output**
Each selected NFT includes comprehensive match analysis:
- **Overall Match Score**: Numerical score (0-10+ scale)
- **Reason**: Human-readable explanation of why it matched
- **Detailed Breakdown**:
  - 📝 **Text Matches**: Specific word matches in name/description/collection
  - 🎭 **Theme Matches**: Emotional theme connections with keywords
  - 🎨 **Visual Matches**: Color and mood-based aesthetic analysis
  - **Collection Info**: Context about the NFT's collection

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

The system provides transparent, explainable AI curation that goes far beyond simple keyword matching to understand emotional context and aesthetic preferences.

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

## Quick Test (No Setup Required)

Want to try the MCP server without local setup? Point directly to our deployed instance:

```json
{
  "mcpServers": {
    "shape-mcp": {
      "url": "https://shape-mcp-server.vercel.app/mcp"
    }
  }
}
```

**Note:** This deployed version is rate limited and is intended for testing/sandbox use only. For production AI applications, we recommend self-hosting your own instance following the setup instructions above.

## Prerequisites

- Alchemy API key for NFT queries (get one [here](https://dashboard.alchemy.com/))
- MCP client like Cursor IDE, Claude Desktop or your AI client of choice
- Optional: Redis for caching (speeds up RPC-heavy tools)

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in:

```bash
ALCHEMY_API_KEY=your_key_here
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

Server is now running at http://localhost:3002/mcp

## 🔌 Client Integration

### MCP Settings

Add to your MCP settings in Cursor for eg:

```json
{
  "mcpServers": {
    "shape-mcp": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

## Project Structure

```
src/
├── tools/                  # Modular tools
│   ├── gasback/
│   ├── network/
│   ├── nft/
│   └── stack/
├── abi/                    # Contract interfaces
├── utils/                  # Helpers like cache.ts
├── addresses.ts            # Key contracts addys
├── clients.ts              # RPC/Alchemy/Redis
├── config.ts               # Env-based setup
├── middleware.ts           # Auth/logging if needed
├── types.ts                # Shared outputs
└── xmcp.config.ts          # xmcp server config
```

Categories keep things modular. Add a tool to /tools/gasback/ and xmcp auto-picks it up. No monolith mess.

## Adding New Tools

1. Pick a category folder (e.g., /tools/gasback/)
2. New .ts file with schema, metadata, function
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
    category: 'gasback',
    chainableWith: ['getShapeCreatorAnalytics'],
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

## Deploy Your Own

Fork this repo and deploy your personal MCP:

1. [Fork on GitHub](https://github.com/shape-network/mcp-server/fork)
2. Import to Vercel: [New Project](https://vercel.com/new)
3. Set env vars: `SHAPE_RPC_URL` (your node), `ALCHEMY_API_KEY`, `CHAIN_ID` (`360` for mainnet, or `11011` for testnet), optional `REDIS_URL`
4. Deploy—access at your-vercel-url/mcp!

## RPC Setup

Use your own Alchemy API key to avoid public RPC limits. Default falls back to Shape’s public node `https://mainnet.shape.network` and `https://sepolia.shape.network`.

## Resources

- [Shape Docs](https://docs.shape.network/)
- [xmcp Framework](https://xmcp.dev/docs)
- [Alchemy Docs](https://docs.alchemy.com/)

## Support

Contact [@williamhzo](https://x.com/williamhzo) or hop into [Shape Discord](https://discord.com/invite/shape-l2).

---

MIT LICENSE - [See LICENSE](./LICENSE)
