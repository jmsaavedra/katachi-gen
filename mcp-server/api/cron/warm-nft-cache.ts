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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Warm NFT cache cron triggered`);

  // Verify this is a cron request (Vercel sets this header)
  const authHeader = req.headers.authorization;

  // In production, Vercel automatically adds the auth header for cron jobs
  // For manual testing, we allow any request in non-production
  if (process.env.NODE_ENV === 'production' && !authHeader?.startsWith('Bearer ')) {
    console.error(`[${timestamp}] ❌ Unauthorized: Missing or invalid auth header`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`[${timestamp}] ✅ Auth check passed, starting NFT cache warming for ${PREDEFINED_WALLETS.length} wallets...`);

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

      const data = {
        userAddress: address,
        ownedNfts: allNfts,
        totalCount,
        pageKey: undefined,
        validAt: {
          blockNumber: 0,
          blockHash: '',
          blockTimestamp: ''
        },
        cached: false,
      };

      // Cache for 2 hours
      await setCached(cacheKey, JSON.stringify(data), 2 * 60 * 60);

      const result = {
        address,
        success: true,
        nftCount: allNfts.length,
        fetchTimeMs: fetchTime
      };

      console.log(`✅ Cached ${allNfts.length} NFTs for ${address} (took ${fetchTime}ms)`);
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
