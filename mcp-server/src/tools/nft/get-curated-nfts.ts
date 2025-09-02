import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAddress } from 'viem';
import { NftOrdering, OwnedNftsResponse } from 'alchemy-sdk';
import { alchemy } from '../../clients';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';

// Blocked contract addresses - NFTs from these contracts will be filtered out
const BLOCKED_CONTRACTS = [
  '0x274b9f633e968a31e8f9831308170720d1072135',
  '0x0602b0fad4d305b2c670808dd9f77b0a68e36c5b',
].map(addr => addr.toLowerCase());

// Rate limiting and retry utilities
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: number })?.code;
      const isRateLimit = errorMessage.includes('429') || errorCode === 429;
      const isLastAttempt = attempt === maxRetries;
      
      if (!isRateLimit || isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delayMs = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Rate limited, retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxRetries})`);
      await delay(delayMs);
    }
  }
  throw new Error('Retry attempts exhausted');
};

export const schema = {
  addresses: z
    .array(z.string().refine((address) => isAddress(address), {
      message: 'Invalid address',
    }))
    .describe('Array of wallet addresses to get curated NFTs from'),
  requestedCount: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe('Number of NFTs to return from multiple addresses'),
};

export const metadata = {
  name: 'getCuratedNfts',
  description: 'Get curated NFTs from multiple addresses with blocked contract filtering',
  annotations: {
    title: 'Get Curated NFTs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-curation',
    educationalHint: true,
    cacheTTL: 60 * 5, // 5 minutes
  },
};

interface CuratedNft {
  name: string | null;
  image: string;
  contractAddress: string;
  tokenId: string;
}

export default async function getCuratedNfts({ 
  addresses, 
  requestedCount 
}: InferSchema<typeof schema>) {
  const startTime = Date.now();
  const cacheKey = `mcp:curatedNfts:${config.chainId}:${addresses.sort().join(',')}:${requestedCount}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    console.log(`🎯 Fetching curated NFTs from ${addresses.length} addresses...`);
    
    // Fetch NFTs from all provided addresses
    const allNfts: CuratedNft[] = [];
    
    for (const address of addresses) {
      try {
        console.log(`📡 Fetching NFTs for address: ${address}`);
        
        const nftsResponse: OwnedNftsResponse = await retryWithBackoff(async () => {
          return await alchemy.nft.getNftsForOwner(address, {
            pageSize: 50, // Fetch more to have options
            omitMetadata: false,
            orderBy: NftOrdering.TRANSFERTIME,
            excludeFilters: [],
          });
        });

        // Convert to our format and add to collection, filtering out blocked contracts
        const addressNfts: CuratedNft[] = nftsResponse.ownedNfts
          .filter(nft => {
            const contractAddress = nft.contract.address.toLowerCase();
            if (BLOCKED_CONTRACTS.includes(contractAddress)) {
              console.log(`🚫 Skipped blocked contract NFT: ${nft.name || 'Unnamed'} from ${contractAddress}`);
              return false;
            }
            return nft.image?.originalUrl || nft.image?.thumbnailUrl;
          })
          .map(nft => ({
            name: nft.name || null,
            image: nft.image?.originalUrl || nft.image?.thumbnailUrl || '',
            contractAddress: nft.contract.address,
            tokenId: nft.tokenId,
          }))
          .filter(nft => nft.image); // Ensure we have an image

        allNfts.push(...addressNfts);
        console.log(`✅ Found ${addressNfts.length} NFTs with images from ${address}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch NFTs from ${address}:`, error);
      }
    }

    if (allNfts.length === 0) {
      throw new Error('No NFTs with images found from any of the provided addresses');
    }

    console.log(`🎯 Selecting ${requestedCount} NFTs from ${allNfts.length} candidates...`);
    
    // Shuffle the NFTs to get a good mix
    const shuffledNfts = allNfts.sort(() => Math.random() - 0.5);
    
    // Take the requested number of NFTs
    const finalNfts = shuffledNfts.slice(0, requestedCount);
    
    const result = {
      curatedNfts: finalNfts,
      stats: {
        totalCandidates: allNfts.length,
        returned: finalNfts.length,
        processingTimeMs: Date.now() - startTime,
      },
      metadata: {
        addresses,
        requestedCount,
        timestamp: new Date().toISOString(),
      },
    };

    if (finalNfts.length === 0) {
      throw new Error(`No NFTs found from any of the provided addresses`);
    }

    if (finalNfts.length < requestedCount) {
      console.warn(`⚠️ Only found ${finalNfts.length} NFTs out of ${requestedCount} requested`);
    }

    console.log(`🎉 Successfully curated ${finalNfts.length} NFTs in ${Date.now() - startTime}ms`);

    const response = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

    await setCached(cacheKey, JSON.stringify(response), metadata.annotations.cacheTTL);
    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Error curating NFTs from ${addresses.length} addresses: ${errorMessage}`,
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