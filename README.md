# Katachi Gen - 形現

**Shape Revealed** - An NFT collection of algorithmically generated 3D Origami forms representing the minter's on-chain journey on Shape.

🏆 Shapecraft2 Hackathon Submission for [Shape Network](https://shape.network/shapecraft)

## Overview

Katachi Gen transforms blockchain data into physical art. By interpreting your wallet's ShapeL2 participation data, we generate unique, foldable origami patterns that represent your on-chain journey. Each NFT is both a digital collectible and a printable origami pattern that can be brought to life.

**Katachi (形)** = Shape/Form in Japanese  
**Gen (現)** = To Appear/Manifest  
**Together: Shape Revealed**

## How It Works

### 🎨 Shape to Shape
At mint time, Katachi Gen:
1. **Analyzes** your wallet's ShapeL2 participation data
2. **Generates** a unique 2D origami pattern (FOLD file) 
3. **Determines** fold complexity based on:
   - Stack rank
   - Shape NFTs owned
   - Other MCP data points
4. **Creates** a 3D visualization of the folded form

### 🖼️ Personalized Art
Your NFT features:
- **Custom graphics** representing NFTs owned by your wallet
- **Stack achievements** visually incorporated into the design
- **Printable files** included in token metadata for physical folding
- **Unique patterns** that evolve from simple to complex based on your participation

## Technical Stack

### Core Technologies
- **Shape MCP Server** - Accessing ShapeL2 wallet data
- **FOLD Format** - Standard origami pattern specification
- **Computational Origami** - Algorithmic pattern generation

### Key Libraries & Resources
- [Rabbit Ear](https://github.com/rabbit-ear) - Computational origami library
- [Origami Simulator](https://github.com/amandaghassaei/OrigamiSimulator) - 3D visualization
- [Jun Mitani's Research](https://www.jst.go.jp/erato/igarashi/publications/001/j15h2mita.pdf) - Flat-foldable origami algorithms
- [Shape MCP Server](https://github.com/shape-network/mcp-server) - Blockchain data integration

## Project Structure

```
katachi-gen/
├── mcp-server/          # Shape MCP server implementation
├── generator/          # Origami pattern generation engine
├── public-site/        # Next.js frontend application
└── public/            # Static assets
```

## AI-Powered Collection Reflection

Beyond the core origami generation, Katachi Gen features an advanced **Collection Reflection** system that uses AI to understand collectors' emotional connections to their NFTs.

### How It Works

**User Experience:**
1. Connected wallets can share their feelings about collecting on Shape Network
2. The AI analyzes their sentiment and curates 5-15 NFTs from their collection that best match their emotional expression
3. Each selected NFT includes detailed match explanations and confidence scores

**AI Sentiment Analysis:**
- **Emotional Theme Detection**: Recognizes 10 core emotions (joy, pride, community, creativity, peace, nostalgia, adventure, wealth, nature, technology)
- **Advanced Scoring**: Multi-layered algorithm analyzing text matches, thematic connections, and visual characteristics
- **Smart Curation**: Ensures collection diversity by limiting to 1 NFT per collection address
- **Transparent Results**: Detailed breakdowns show why each NFT matched the user's sentiment

**Technical Implementation:**
- **MCP Server Integration**: `interpretCollectionSentiment` tool processes sentiment against NFT metadata
- **Comprehensive Analysis**: Scores NFTs based on name matches (+3 pts), description matches (+2 pts), collection matches (+1 pt), and thematic connections
- **Visual Matching**: Experimental color and mood analysis (currently metadata-based)
- **Performance Optimized**: Analyzes up to 500 NFTs with Redis caching for sub-second responses

This creates a deeply personal connection between collectors and their digital art, transforming NFT browsing into an emotional journey of self-discovery.

> For detailed technical specifications of the sentiment analysis algorithm, see [mcp-server/README.md](./mcp-server/README.md#interpretcollectionsentiment)

## Minting Eligibility

- **Requirement**: Must own a Stack NFT on ShapeL2
- **Limit**: None
- **Uniqueness**: Each mint generates a unique pattern based on current wallet state

## Cultural Inspiration

Inspired by **Origami Kabuto** (traditional Japanese samurai helmet), a playful origami form commonly folded by Japanese youth. Katachi Gen brings this cultural art form into the blockchain era, creating a bridge between ancient craft and modern technology.

## The Vision

Every wallet tells a story through its on-chain activity. Katachi Gen transforms that story into a tangible piece of art - a unique origami form that can exist both digitally and physically, representing your journey in the Shape ecosystem.

## Team

Built with ❤️ by:
- **Sembo** ([@1000b](https://twitter.com/1000b))
- **Joe** ([@quietloops](https://twitter.com/quietloops))

## Links

- [Shapecraft2 Hackathon](https://shape.network/shapecraft)
- [Shape Network](https://shape.network)

## TODO & Future Enhancements

### 🎨 Enhanced Visual Analysis (High Priority)

- **Goal**: Implement real computer vision for NFT artwork analysis
- **Current Limitation**: System only performs text-based matching on NFT metadata
- **Desired Enhancement**: Google Vision API or OpenAI Vision integration for object/color detection
- **Impact**: Users mentioning "apples", "cats", etc. would get NFTs with actual visual matches

### 🔄 NFT Metadata Enrichment

- Cache and enrich NFT metadata with additional data sources
- Integrate with NFT marketplace APIs for rarity/value data
- Enhanced collection analytics and insights

### 📊 Advanced Analytics Dashboard

- Historical sentiment analysis trends for collectors
- Collection growth insights and personal behavior patterns
- Cross-wallet collection analysis and recommendations

### 🤖 Smart Collection Recommendations

- AI-powered suggestions for new NFTs based on collection sentiment
- Cross-collection theme analysis and pattern recognition
- Marketplace integration for intelligent purchase recommendations

> See [TODO.md](./TODO.md) for detailed implementation plans and technical specifications.

---

*Transform your on-chain journey into physical art with Katachi Gen*
