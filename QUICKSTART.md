# Katachi Gen - Quick Start Guide

Run the full stack locally in 5 minutes.

## 📦 One-Time Setup

```bash
# 1. Install dependencies
cd public-site && npm install && cd ..
cd katachi-generator && npm install && cd ..

# 2. Configure environment
cd public-site
cp .env-example .env.local
# Edit .env.local - add your Alchemy and WalletConnect keys

cd ../katachi-generator
# .env should already exist with defaults

# 3. Build generator template
cd katachi-generator
npm run build
cd ..
```

## 🚀 Start Development

### Terminal 1 - Frontend
```bash
cd public-site
npm start
```
→ **http://localhost:3000**

### Terminal 2 - Backend
```bash
cd katachi-generator
npm start
```
→ **http://localhost:3001**

## 🔑 Required API Keys

Edit `public-site/.env.local`:

```bash
NEXT_PUBLIC_ALCHEMY_KEY=your_key_here
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

Get keys from:
- **Alchemy**: https://www.alchemy.com/
- **WalletConnect**: https://cloud.walletconnect.com/

## 🧪 Test It Works

1. Open http://localhost:3000
2. Connect wallet
3. Enter sentiment text
4. Generate pattern
5. View 3D preview

## 📖 Full Documentation

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for complete setup guide.

## ⚙️ Configuration Summary

| Service | Port | Environment |
|---------|------|-------------|
| Frontend | 3000 | `public-site/.env.local` |
| Generator | 3001 | `katachi-generator/.env` |
| MCP Server | N/A | **Production endpoint** (no local setup needed) |

## 🛑 Stopping Services

Press `Ctrl+C` in each terminal window.

---

**That's it!** Both services use `npm start` for consistency.
