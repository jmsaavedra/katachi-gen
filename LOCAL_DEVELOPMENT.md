# Local Development Setup

Complete guide for running Katachi Gen locally with the production MCP server.

## 🎯 Overview

This setup runs:
- **Public Site** (Next.js frontend) - `localhost:3000`
- **Katachi Generator** (Pattern generation backend) - `localhost:3001`
- **MCP Server** - Production endpoint (no local server needed)

## 📋 Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm** or **pnpm**
- **Git**
- **API Keys** (see Environment Setup below)

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
cd /Users/jmsaavedra/Documents/_GitHub/katachi-gen
```

### 2. Install Dependencies

#### Option A: Install All at Once
```bash
# Install public-site dependencies
cd public-site && npm install && cd ..

# Install katachi-generator dependencies
cd katachi-generator && npm install && cd ..
```

#### Option B: Install Individually (if you encounter issues)
```bash
# Public site
cd public-site
npm install
cd ..

# Generator
cd katachi-generator
npm install
cd ..
```

### 3. Environment Configuration

#### Public Site Environment
```bash
cd public-site
cp .env-example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Shape Network Configuration
NEXT_PUBLIC_READ_CHAIN_ID=360           # Shape Mainnet (for reading NFT data)
NEXT_PUBLIC_MINT_CHAIN_ID=11011         # Shape Sepolia (for testing minting)
NEXT_PUBLIC_ALLOW_MAINNET_MINTING=false # Safety: prevent accidental mainnet mints

# Contract Addresses
NEXT_PUBLIC_KATACHI_CONTRACT_TESTNET=0x4c0041C6A3B5bFf81415be201e779d96a146683f
NEXT_PUBLIC_KATACHI_CONTRACT_MAINNET=0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57

# API Keys (REQUIRED)
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key_here
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id_here

# MCP Server URL - PRODUCTION ENDPOINT
MCP_SERVER_URL=https://katachi-gen-mcp-server.vercel.app/mcp

# Backend Generator URL
NEXT_PUBLIC_GENERATOR_URL=http://localhost:3001

# Test Mode (allows manual wallet address input)
NEXT_PUBLIC_ENABLE_TEST_MODE=true
```

**📝 How to Get API Keys:**

1. **Alchemy API Key** (Required)
   - Go to https://www.alchemy.com/
   - Sign up / Log in
   - Create a new app for "Shape" network
   - Copy the API key

2. **WalletConnect Project ID** (Required)
   - Go to https://cloud.walletconnect.com/
   - Sign up / Log in
   - Create a new project
   - Copy the Project ID

#### Katachi Generator Environment
```bash
cd ../katachi-generator
```

Check if `.env` exists (it should from the repo):
```bash
ls -la .env
```

If it doesn't exist, create it:
```bash
touch .env
```

Edit `.env` with your configuration:

```bash
# Server Port
PORT=3001

# Environment
NODE_ENV=development

# Arweave Configuration (for NFT storage)
# In development, uses local wallet file if available
# In production, uses environment variables
ARWEAVE_WALLET_PATH=keys/arweave-wallet.json

# Cloudflare R2 Configuration (Optional - for preview hosting)
# If not configured, will skip R2 uploads (Arweave uploads still work)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket-url.r2.dev
```

**📝 Optional Services:**

- **Arweave Wallet**: Needed for permanent NFT storage
  - You should already have this at `katachi-generator/keys/arweave-wallet.json`
  - If missing, get AR tokens and create wallet at https://arweave.org/

- **Cloudflare R2**: Optional preview hosting
  - Without R2: Pattern generation still works, but previews won't be hosted
  - With R2: Preview URLs available before Arweave upload
  - Get credentials at https://dash.cloudflare.com/

### 4. Build the Generator Template

The generator needs to build the EJS template before starting:

```bash
cd katachi-generator
npm run build
cd ..
```

This will:
1. Run `build-ejs.js` to compile EJS templates
2. Run webpack to create the final template
3. Output: `dist/template.html` and `public/generated-index.html`

## 🎮 Running the Services

### Terminal 1: Public Site (Frontend)
```bash
cd public-site
npm start
```

**Output:**
```
▲ Next.js 15.3.2
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000
```

**Access:** http://localhost:3000

**Note:** `npm start` runs the development server with Turbopack. For production mode, use `npm run start:prod` (requires `npm run build` first).

### Terminal 2: Katachi Generator (Backend)
```bash
cd katachi-generator
npm start
```

**Output:**
```
Server running on port 3001
Arweave Wallet Address: WJBf3OFtVmHVaIwMzIGq4nBseTRobFUiJmc2OW52-Dk
Arweave Wallet Balance: X.XX AR
```

**Available Endpoints:**
- `http://localhost:3001/` - Pattern generation
- `http://localhost:3001/upload-metadata` - Metadata upload
- `http://localhost:3001/wallet-info` - Wallet status
- `http://localhost:3001/test.html` - Test page

## 🔍 Verifying the Setup

### 1. Check Frontend
- Open http://localhost:3000
- You should see the Katachi Gen landing page
- Try connecting a wallet with RainbowKit

### 2. Check Generator Health
```bash
curl http://localhost:3001/wallet-info
```

Expected response:
```json
{
  "address": "WJBf3OFtVmHVaIwMzIGq4nBseTRobFUiJmc2OW52-Dk",
  "balance": "X.XX AR"
}
```

### 3. Test MCP Server Connection
The frontend will automatically connect to the production MCP server when you:
1. Connect your wallet
2. Enter sentiment text
3. Request NFT curation

Check browser console for:
```
✓ MCP Server connected: https://katachi-gen-mcp-server.vercel.app/mcp
```

## 🧪 Testing the Full Flow

### 1. Connect Wallet
- Click "Connect Wallet" on homepage
- Connect with any Shape-compatible wallet

### 2. View NFTs
- Enter a wallet address (if test mode enabled)
- Or use your connected wallet
- View NFT collection

### 3. Generate Pattern
- Enter your collecting sentiment
- Click "Generate Pattern"
- MCP server analyzes sentiment (production endpoint)
- Generator creates origami pattern
- View 3D preview

### 4. Mint NFT (Testnet)
- Click "Mint" on the preview
- Approve transaction in wallet
- Pattern uploads to Arweave
- NFT mints on Shape Sepolia testnet

## 📂 Project Structure

```
katachi-gen/
├── public-site/              # Frontend (Port 3000)
│   ├── app/                  # Next.js pages
│   ├── components/           # React components
│   ├── lib/                  # Web3 configuration
│   └── .env.local           # Environment config
│
└── katachi-generator/        # Backend (Port 3001)
    ├── server.js             # Main server
    ├── handlers/             # Request handlers
    ├── image/                # Image processing
    ├── storage/              # Arweave/R2 uploads
    ├── public/               # Static assets
    ├── src/template/         # EJS template source
    └── .env                  # Environment config
```

## 🛠️ Development Workflow

### Making Frontend Changes
```bash
cd public-site
npm start
# Make changes - hot reload enabled with Turbopack
```

### Making Generator Changes
```bash
cd katachi-generator
npm start
# Make changes - restart server manually
```

### Updating Templates
```bash
cd katachi-generator
# 1. Edit EJS files in src/template/partials/
vim src/template/partials/body-content.ejs

# 2. Rebuild
npm run build

# 3. Restart server
npm start
```

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module"
```bash
# Solution: Reinstall dependencies
cd public-site && npm install
cd ../katachi-generator && npm install
```

### Issue: "Port 3000 already in use"
```bash
# Solution: Kill existing process
lsof -ti:3000 | xargs kill -9
# Next.js will auto-detect and offer port 3001 if 3000 is busy
```

### Issue: "Port 3001 already in use"
```bash
# Solution: Kill existing process
lsof -ti:3001 | xargs kill -9
# Or change PORT in katachi-generator/.env
```

### Issue: "MCP Server connection failed" or "Error fetching nft data"
```bash
# The production MCP server may have rate limits or API key issues
# Solution: Run MCP server locally

# 1. Disable Redis in mcp-server/.env (comment out REDIS_URL)
# 2. Start MCP server
cd mcp-server
npm install
npm run dev

# 3. Update public-site/.env.local to use local MCP:
# MCP_SERVER_URL=http://localhost:3002/mcp

# 4. Restart frontend to pick up new config
```

### Issue: Redis errors flooding MCP server logs
```bash
# Solution: Comment out REDIS_URL in mcp-server/.env
# Edit mcp-server/.env and change:
# REDIS_URL=rediss://...
# to:
# # REDIS_URL=rediss://...

# MCP will work fine without Redis (just no caching)
```

### Issue: "Alchemy API rate limit exceeded"
```bash
# Solution:
# 1. Get a new API key from alchemy.com
# 2. Or wait for rate limit to reset (usually 1 minute)
# 3. Or upgrade your Alchemy plan
```

### Issue: "Template not found"
```bash
# Solution: Build the template
cd katachi-generator
npm run build
# Should create dist/template.html
```

### Issue: "Arweave wallet not found"
```bash
# Solution: Check wallet file exists
ls -la katachi-generator/keys/arweave-wallet.json
# If missing, contact team for wallet file or create new one
```

## 🔒 Security Notes

### ⚠️ Important: Never Commit These Files
- `public-site/.env.local` (contains API keys)
- `katachi-generator/.env` (contains secrets)
- `katachi-generator/keys/arweave-wallet.json` (contains private keys)

These should already be in `.gitignore`.

### 🔐 Mainnet Minting Safety
The config has `NEXT_PUBLIC_ALLOW_MAINNET_MINTING=false` by default.
This prevents accidental minting on mainnet during development.

To enable mainnet minting (production only):
```bash
NEXT_PUBLIC_ALLOW_MAINNET_MINTING=true
```

## 📊 Service URLs Summary

| Service | Port | URL | Notes |
|---------|------|-----|-------|
| **Public Site** | 3000 | http://localhost:3000 | Next.js frontend |
| **Generator** | 3001 | http://localhost:3001 | Pattern generation |
| **MCP Server** | N/A | https://katachi-gen-mcp-server.vercel.app/mcp | Production endpoint |
| **Shape Mainnet** | N/A | https://rpc.shape.network | Reading NFT data |
| **Shape Sepolia** | N/A | https://sepolia.shape.network | Testnet minting |

## 🎯 Next Steps

Once running locally:

1. **Test Pattern Generation**: Generate a few patterns to verify the full pipeline
2. **Review Code**: Familiarize yourself with the modular architecture
3. **Make Changes**: Update templates, styles, or logic as needed
4. **Run Validation**: Use `./run-validation.sh` to verify template integrity

## 📚 Additional Documentation

- [README.md](README.md) - Project overview
- [TODO.md](TODO.md) - Planned improvements
- [katachi-generator/docs/](katachi-generator/docs/) - Generator documentation
- [katachi-generator/README-REFACTOR.md](katachi-generator/README-REFACTOR.md) - Backend architecture

## 💬 Getting Help

If you encounter issues not covered here:

1. Check the logs in both terminal windows
2. Review browser console for frontend errors
3. Check generator server logs for backend errors
4. Verify all API keys are correct
5. Ensure all dependencies are installed

---

**Happy developing! 🎨**
