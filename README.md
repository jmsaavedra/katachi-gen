# Katachi Gen - カタチ・ゲン

Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey on ShapeL2, creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.

🏆 [Shapecraft2 Hackathon](https://shape.network/shapecraft) Submission.

<div align="center">
  
## 🎯 [Mint Your Katachi Gen NFT at katachi-gen.com](https://katachi-gen.com)

[![Mint Now](https://img.shields.io/badge/MINT%20NOW-katachi--gen.com-blue?style=for-the-badge&logo=ethereum&logoColor=white)](https://katachi-gen.com)
[![Shape Network](https://img.shields.io/badge/Shape%20Network-Mainnet%20Live-green?style=for-the-badge)](https://shapescan.xyz/address/0x3293D7cb0E2548fC51ed884a3088fBD0B6F4b8e1)

**Live on Shape Mainnet** • Transform your on-chain journey into unique origami art

</div>

---

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

Beyond the core origami generation, Katachi Gen features a **Sentiment Filter** system that uses AI to understand collectors' emotional connections to their NFTs. This filter curates 5 NFTs from their collection to uniquely map artwork to the faces of their origami shape. Every mint will be uniquely filtered and textured based on what the collector writes at the time of minting. 

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

## Smart Contract Details

### Deployed Contracts
Katachi Gen is deployed on both Shape mainnet and testnet:

- **Shape Mainnet**: [`0x3293D7cb0E2548fC51ed884a3088fBD0B6F4b8e1`](https://shapescan.xyz/address/0x3293D7cb0E2548fC51ed884a3088fBD0B6F4b8e1)
- **Shape Sepolia Testnet**: [`0x06740C004c98afA7f9F5C38C00B8DAF9c33ABFB3`](https://sepolia.shapescan.xyz/token/0x06740C004c98afA7f9F5C38C00B8DAF9c33ABFB3)
- **Token Standard**: ERC-721
- **Token Symbol**: KGEN
- **Token Name**: KatachiGen

### Contract Features
- **Owner-Controlled Minting**: Currently requires owner permission (will be updated for public minting)
- **Metadata Support**: Full on-chain SVG storage with rich trait metadata
- **Burnable**: NFTs can be burned by their owners
- **OpenSea Compatible**: Full marketplace support with proper metadata standards

### Minting Process
1. **Pattern Generation**: Your wallet's Shape NFT data generates a unique origami pattern
2. **SVG Creation**: The pattern is rendered as an on-chain SVG with metadata
3. **Mint Transaction**: Execute `safeMintWithURI` with auto-generated token ID
4. **Gasback Rewards**: Benefit from Shape's 80% sequencer fee cashback program

## Minting Eligibility

- **Requirement**: Connected wallet with Shape network activity
- **Cost**: Gas fees only (no mint price)
- **Limit**: None - mint as many unique patterns as you want
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

- [Smart Contract Repository](https://github.com/jmsaavedra/katachi-gen-721-contract) - ERC-721 contract source code
- [View on Shape Mainnet](https://shapescan.xyz/address/0x3293D7cb0E2548fC51ed884a3088fBD0B6F4b8e1) - Live contract on Shape
- [View on Shape Testnet](https://sepolia.shapescan.xyz/token/0x06740C004c98afA7f9F5C38C00B8DAF9c33ABFB3) - Test deployment
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
