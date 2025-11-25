import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAddress } from 'viem';
import { alchemy } from '../../clients';
import { getCached, setCached } from '../../utils/cache';
import type { OwnedNftsResponse } from 'alchemy-sdk';

export const schema = {
  userAddress: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid address',
    })
    .describe('The wallet address to fetch NFTs for'),
};

export const metadata = {
  name: 'getPrefetchedNfts',
  description:
    'Get all NFTs owned by an address with server-side caching. Optimized for pre-defined demo wallets.',
  annotations: {
    title: 'Get Prefetched NFTs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: false,
    cacheTTL: 60 * 60 * 2, // 2 hours cache for demo wallets
  },
};

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

export default async function getPrefetchedNfts({
  userAddress,
}: InferSchema<typeof schema>) {
  const normalizedAddress = userAddress.toLowerCase();
  const isPredefinedWallet = PREDEFINED_WALLETS.includes(normalizedAddress);

  // Only cache pre-defined wallets
  if (isPredefinedWallet) {
    const cacheKey = `mcp:prefetchedNfts:${normalizedAddress}`;
    const cached = await getCached(cacheKey);

    if (cached) {
      console.log(`✓ Cache hit for ${userAddress}`);
      // Cached data is already in the xmcp response format
      return JSON.parse(cached);
    }

    console.log(`✗ Cache miss for ${userAddress}, fetching from Alchemy...`);
  }

  try {
    // Fetch all NFTs by paginating through results
    let allNfts: any[] = [];
    let pageKey: string | undefined = undefined;
    let totalCount = 0;

    do {
      const response: OwnedNftsResponse = await alchemy.nft.getNftsForOwner(userAddress, {
        pageKey,
        pageSize: 100,
      });

      allNfts = allNfts.concat(response.ownedNfts);
      pageKey = response.pageKey;
      totalCount = response.totalCount;

      // Safety check to prevent excessive API calls
      if (allNfts.length > 10000) {
        console.warn('Stopping NFT fetch at 10,000 NFTs to prevent excessive API calls');
        break;
      }
    } while (pageKey);

    // Strip metadata for caching to reduce payload size
    const strippedNfts = isPredefinedWallet
      ? allNfts.map(stripNFTMetadata)
      : allNfts;

    const result = {
      userAddress,
      ownedNfts: strippedNfts,
      totalCount: totalCount,
      pageKey: undefined,
      validAt: {
        blockNumber: 0,
        blockHash: '',
        blockTimestamp: ''
      },
      cached: false,
    };

    // Format response in xmcp expected format
    const response = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

    // Cache for pre-defined wallets
    if (isPredefinedWallet) {
      const cachePayload = JSON.stringify(response);
      const sizeInMB = (cachePayload.length / (1024 * 1024)).toFixed(2);

      await setCached(
        `mcp:prefetchedNfts:${normalizedAddress}`,
        cachePayload,
        60 * 60 * 2 // 2 hours TTL
      );
      console.log(`✓ Cached ${allNfts.length} NFTs for ${userAddress} (${sizeInMB}MB)`);
    }

    return response;
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    const errorOutput = {
      error: true,
      message: `Failed to fetch NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      userAddress,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorOutput, null, 2),
        },
      ],
    };
  }
}
