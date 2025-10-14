# Rarible API Integration for Optimized Image Handling

## Problem Solved
Large GIF files (like the 5.gif from the failing NFT) were causing failures during HTML compilation because:
1. Large file downloads were timing out
2. Base64 encoding bloated HTML size significantly
3. Memory issues during processing

## Solution
Integrated Rarible API to fetch pre-optimized thumbnail images instead of downloading and encoding raw IPFS files.

## Implementation

### 1. New Files Created

#### `utils/raribleClient.js`
Simple REST API client for Rarible that:
- Fetches NFT metadata with optimized image URLs
- Provides multiple image sizes: preview, big, initial, original, portrait
- Uses native `https` module (no additional dependencies needed)
- Returns best available image URL (prioritizes smaller sizes)

### 2. Modified Files

#### `.env`
Added:
```
RARIBLE_API_KEY=ad15a905-32eb-4a43-9e10-fe2e8d33f9c7
```

#### `image/processor.js`
Enhanced `processImagesAsBase64()` to:
1. Check if image object has `contractAddress` and `tokenId`
2. If available, fetch optimized thumbnail from Rarible API first
3. Fall back to direct download if Rarible fails or no contract info
4. Track which images used Rarible optimization in stats

## How It Works

### Input Format (from client)
```javascript
{
  images: [
    {
      url: "ipfs://bafybei.../5.gif",
      contractAddress: "0x091Ca02Ce52d027C11B62dd77ECF5F0d015cBF69",
      tokenId: "5"
    }
  ]
}
```

### Processing Flow
1. **Rarible API Call** → Get optimized thumbnail URL
2. **Download** → Fetch smaller optimized image (~50-200KB instead of 5MB+)
3. **Compress** → Further compress with Sharp
4. **Base64 Encode** → Embed in HTML

### Output Stats
```javascript
imageStats: {
  totalImages: 5,
  processedImages: 5,
  failedImages: 0,
  raribleOptimized: 3,  // New metric
  timestamp: "2025-10-13T..."
}
```

## API Details

### Rarible REST Endpoint
```
GET https://api.rarible.org/v0.1/items/SHAPE:{contractAddress}:{tokenId}
Headers:
  X-API-KEY: {your_api_key}
```

### Response Structure
```javascript
{
  id: "SHAPE:0x...:5",
  meta: {
    name: "NFT Name",
    description: "...",
    content: [
      {
        url: "https://optimized-cdn.com/preview.jpg",
        representation: "PREVIEW",
        mimeType: "image/jpeg"
      },
      {
        url: "https://optimized-cdn.com/big.jpg",
        representation: "BIG"
      }
    ]
  }
}
```

## Benefits

1. **Faster Processing** - Smaller files download faster
2. **More Reliable** - Pre-optimized by Rarible's CDN
3. **Smaller HTML** - Base64-encoded size is much smaller
4. **Graceful Fallback** - Still works without contract info
5. **No New Dependencies** - Uses native Node.js `https` module

## Testing

To test with the problematic NFT:
```javascript
// Client request
POST http://localhost:3001/
{
  "images": [
    {
      "url": "ipfs://bafybeig53todorvrvozqhntrvu3yijt5fpjdtyrm5hyezozwdcn4qpe4fq/5.gif",
      "contractAddress": "0x091Ca02Ce52d027C11B62dd77ECF5F0d015cBF69",
      "tokenId": "5"
    }
  ],
  "walletAddress": "0x...",
  "patternType": "Crane"
}
```

Expected behavior:
1. Logs show "Attempting to fetch optimized image from Rarible"
2. Logs show "Using Rarible optimized image: https://..."
3. Processing completes successfully
4. Stats show `raribleOptimized: 1`

## Future Improvements

1. **Caching** - Cache Rarible responses locally to reduce API calls
2. **Batch Requests** - If Rarible supports batch endpoints, fetch multiple NFTs at once
3. **Better Parsing** - Extract contract/tokenId from IPFS URLs automatically
4. **Size Preference** - Allow configuring preferred image size (preview vs big)

## Architecture Decision

We chose to implement this in **katachi-generator** directly rather than routing through mcp-server because:
- Direct API call is faster (no intermediate hop)
- Simpler flow for HTML generation pipeline
- Independent service operation (no cross-service dependencies)
- Rarible API is fast and lightweight (just JSON responses)
