// Vercel Cron endpoint to warm NFT cache for pre-defined demo wallets
// This runs every 2 hours to keep cache fresh

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { alchemy } from '../../src/clients';
import { getCached, setCached } from '../../src/utils/cache';

const PREDEFINED_WALLETS = [
  '0x9f6ae0370d74f0e591c64cec4a8ae0d627817014',
  '0xee49f82e58a1c2b306720d0c68047cbf70c11fb5',
  '0x136bbfe37988f82f8585ed155615b75371489d45',
  '0xd20ce27f650598c2d790714b4f6a7222b8ddce22'
];

/**
 * Strip NFT metadata to only essential fields for caching
 * Reduces payload size by ~80-90% to fit within Redis limits
 */
function stripNFTMetadata(nft: any) {
  return {
    contract: {
      address: nft.contract?.address,
      name: nft.contract?.name,
    },
    tokenId: nft.tokenId,
    tokenType: nft.tokenType,
    name: nft.name || nft.title,
    image: {
      cachedUrl: nft.image?.cachedUrl,
      thumbnailUrl: nft.image?.thumbnailUrl,
      originalUrl: nft.image?.originalUrl,
    },
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Warm NFT cache cron triggered`);
  console.log(`[${timestamp}] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[${timestamp}] Auth header present: ${!!req.headers.authorization}`);
  console.log(`[${timestamp}] Auth header value: ${req.headers.authorization?.substring(0, 20)}...`);

  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;

  // Temporarily disable auth check to test caching functionality
  // TODO: Re-enable after verifying Vercel cron auth headers work correctly
  // if (process.env.NODE_ENV === 'production' && !authHeader?.startsWith('Bearer ')) {
  //   console.error(`[${timestamp}] ❌ Unauthorized: Missing or invalid auth header`);
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log(`[${timestamp}] ✅ Starting NFT cache warming for ${PREDEFINED_WALLETS.length} wallets...`);

  const results = [];

  for (const address of PREDEFINED_WALLETS) {
    try {
      const normalizedAddress = address.toLowerCase();
      const cacheKey = `mcp:prefetchedNfts:${normalizedAddress}`;

      // Fetch all NFTs with pagination
      let allNfts: any[] = [];
      let pageKey: string | undefined = undefined;
      let totalCount = 0;
      const startTime = Date.now();

      do {
        const response = await alchemy.nft.getNftsForOwner(address, {
          pageKey,
          pageSize: 100,
        });

        allNfts = allNfts.concat(response.ownedNfts);
        pageKey = response.pageKey;
        totalCount = response.totalCount;

        // Safety check to prevent excessive API calls
        if (allNfts.length > 10000) {
          console.warn(`⚠️ Stopping NFT fetch at 10,000 NFTs for ${address}`);
          break;
        }
      } while (pageKey);

      const fetchTime = Date.now() - startTime;

      // Strip metadata to reduce payload size for caching
      const strippedNfts = allNfts.map(stripNFTMetadata);

      const data = {
        userAddress: address,
        ownedNfts: strippedNfts,
        totalCount,
        pageKey: undefined,
        validAt: {
          blockNumber: 0,
          blockHash: '',
          blockTimestamp: ''
        },
        cached: false,
      };

      // Format in xmcp expected format (matching get-prefetched-nfts.ts)
      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };

      // Cache for 2 hours
      const cachePayload = JSON.stringify(response);
      const sizeInMB = (cachePayload.length / (1024 * 1024)).toFixed(2);

      await setCached(cacheKey, cachePayload, 2 * 60 * 60);

      const result = {
        address,
        success: true,
        nftCount: allNfts.length,
        fetchTimeMs: fetchTime,
        sizeInMB: parseFloat(sizeInMB)
      };

      console.log(`✅ Cached ${allNfts.length} NFTs for ${address} (${sizeInMB}MB, took ${fetchTime}ms)`);
      results.push(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to cache NFTs for ${address}:`, errorMessage);
      results.push({
        address,
        success: false,
        error: errorMessage
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalNfts = results.reduce((sum, r) => sum + (r.nftCount || 0), 0);

  console.log(`[${timestamp}] ✅ NFT cache warming complete: ${successCount}/${PREDEFINED_WALLETS.length} wallets cached (${totalNfts} total NFTs)`);

  return res.status(200).json({
    status: 'ok',
    message: `Successfully cached ${successCount}/${PREDEFINED_WALLETS.length} wallets`,
    timestamp,
    results,
    totalNfts,
    next_run: 'in 2 hours'
  });
}
