# Production Deployment Checklist

## 🚀 MCP Server (Vercel)

### 🔥 Cold Start Prevention (Vercel Cron)

The MCP server includes a **Vercel Cron job** that runs every 10 minutes to keep the server warm.

**Configuration**: Automatically deployed from `mcp-server/vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/keep-alive",
    "schedule": "*/10 * * * *"
  }]
}
```

**✅ Verify after deployment:**
- Go to Vercel Dashboard → Your MCP Project → **Cron Jobs** tab
- You should see the `keep-alive` job listed
- Check logs for: "✅ Keep-alive cron executed - MCP server is warm"

**Note**: Vercel Cron requires **Vercel Pro** (which you have ✅)

### Required Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# REQUIRED
ALCHEMY_API_KEY=ZZdf65iPU4YJswPiNA4Kg

# Chain Configuration
READ_CHAIN_ID=360                    # Shape Mainnet for reading NFT data
MINT_CHAIN_ID=11011                  # Shape Sepolia for minting

# Contract Addresses
KATACHI_CONTRACT_TESTNET=0x4c0041C6A3B5bFf81415be201e779d96a146683f
KATACHI_CONTRACT_MAINNET=0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57

# Development Settings
DISABLE_RATE_LIMIT=true
```

### Optional (Performance)
```bash
# Redis Caching (Optional - skip if not needed)
REDIS_URL=<your_upstash_redis_url>

# Rarible API (Optional - for additional NFT data)
RARIBLE_API_KEY=ad15a905-32eb-4a43-9e10-fe2e8d33f9c7
```

### ✅ Verification Steps

After deploying:

1. **Health Check**
   ```bash
   curl https://katachi-gen-mcp-server.vercel.app/health
   ```
   Should return: `{"status":"ok",...}`

2. **Test Stack Achievements**
   ```bash
   curl -X POST https://katachi-gen-mcp-server.vercel.app/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "getStackAchievements",
         "arguments": {
           "userAddress": "0xee49f82e58a1c2b306720d0c68047cbf70c11fb5"
         }
       },
       "id": 1
     }'
   ```
   Should return stack data without errors.

3. **Test Sentiment Interpretation**
   ```bash
   curl -X POST https://katachi-gen-mcp-server.vercel.app/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "interpretCollectionSentiment",
         "arguments": {
           "address": "0xee49f82e58a1c2b306720d0c68047cbf70c11fb5",
           "sentiment": "Digital collectibles inspire my creativity",
           "count": 5
         }
       },
       "id": 1
     }'
   ```
   Should return curated NFTs without "Error fetching nft data".

---

## 🎨 Public Site (Vercel/Your Host)

### Required Environment Variables

```bash
# Shape Network
NEXT_PUBLIC_READ_CHAIN_ID=360
NEXT_PUBLIC_MINT_CHAIN_ID=11011
NEXT_PUBLIC_ALLOW_MAINNET_MINTING=false

# Contracts
NEXT_PUBLIC_KATACHI_CONTRACT_TESTNET=0x4c0041C6A3B5bFf81415be201e779d96a146683f
NEXT_PUBLIC_KATACHI_CONTRACT_MAINNET=0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57

# API Keys
NEXT_PUBLIC_ALCHEMY_KEY=ZZdf65iPU4YJswPiNA4Kg
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=1ebfb928a364d352be8c94d5b3a4d619

# Service URLs - PRODUCTION
MCP_SERVER_URL=https://katachi-gen-mcp-server.vercel.app/mcp
KATACHI_GENERATOR_URL=https://katachi-gen-production.up.railway.app
NEXT_PUBLIC_GENERATOR_URL=https://katachi-gen-production.up.railway.app

# Features
NEXT_PUBLIC_ENABLE_TEST_MODE=true
```

### ✅ Verification Steps

1. Visit your production site
2. Click "Explore"
3. Enter sentiment text
4. Click "Curate Collection"
5. Should see NFTs load without MCP errors

---

## 🎯 Katachi Generator (Railway/Your Host)

### Required Environment Variables

```bash
PORT=3001
NODE_ENV=production

# Arweave
ARWEAVE_WALLET_PATH=keys/arweave-wallet.json
# Or set ARWEAVE_WALLET_KEY directly in production

# Optional: Cloudflare R2 for previews
R2_ACCOUNT_ID=<your_account_id>
R2_ACCESS_KEY_ID=<your_key>
R2_SECRET_ACCESS_KEY=<your_secret>
R2_BUCKET_NAME=<your_bucket>
R2_PUBLIC_URL=https://<your-bucket>.r2.dev
```

### ✅ Verification Steps

```bash
curl https://katachi-gen-production.up.railway.app/wallet-info
```

Should return Arweave wallet info.

---

## 🔍 Common Issues

### "Error fetching nft data"
- ❌ `ALCHEMY_API_KEY` not set in Vercel
- ❌ API key is invalid or rate-limited
- ✅ Fix: Set correct key in Vercel environment variables

### "MCP server connection failed"
- ❌ MCP server not deployed
- ❌ Wrong URL in public-site config
- ✅ Fix: Check deployment and URLs

### Redis Connection Errors (Safe to Ignore)
- ⚠️ Redis errors are non-blocking
- ✅ App works without Redis (just no caching)
- ✅ Fix: Either disable REDIS_URL or provide valid Upstash URL

---

## 📝 Deployment Order

1. **Deploy MCP Server First**
   - Set environment variables
   - Deploy to Vercel
   - Test endpoints

2. **Deploy Katachi Generator**
   - Ensure Arweave wallet configured
   - Deploy to Railway
   - Test pattern generation

3. **Deploy Public Site**
   - Configure all service URLs
   - Deploy frontend
   - Test full flow

---

## ✅ Final Verification

Test the complete flow:
1. Visit production site
2. Click "Explore" with test wallet
3. View NFTs (tests Alchemy integration)
4. Enter sentiment and curate (tests MCP server)
5. Generate pattern (tests Generator service)
6. Verify preview loads correctly

If all steps work, your production deployment is complete! 🎉
