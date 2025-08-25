import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { NftOrdering, OwnedNftsResponse } from 'alchemy-sdk';
import { alchemy } from '../../clients';
import { config } from '../../config';
import type { ShapeNftOutput, ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';
import { validateImageCors } from './validate-image-cors';

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
    .max(10)
    .default(5)
    .describe('Number of CORS-valid NFTs to return (will fetch more and filter)'),
  corsTimeout: z
    .number()
    .default(3000)
    .describe('Timeout for CORS validation in milliseconds'),
};

export const metadata = {
  name: 'getCuratedNftsWithCorsValidation',
  description: 'Get curated NFTs from multiple addresses with CORS validation for reliable texture loading',
  annotations: {
    title: 'Get Curated NFTs (CORS Validated)',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-curation',
    educationalHint: true,
    cacheTTL: 60 * 10, // 10 minutes
  },
};

interface CuratedNft {
  name: string | null;
  image: string;
  contractAddress: string;
  tokenId: string;
  corsValid?: boolean;
}

export default async function getCuratedNftsWithCorsValidation({ 
  addresses, 
  requestedCount, 
  corsTimeout 
}: InferSchema<typeof schema>) {
  const startTime = Date.now();
  const cacheKey = `mcp:curatedNfts:${config.chainId}:${addresses.sort().join(',')}:${requestedCount}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    console.log(`🎯 Fetching curated NFTs from ${addresses.length} addresses with CORS validation...`);
    
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

        // Convert to our format and add to collection
        const addressNfts: CuratedNft[] = nftsResponse.ownedNfts
          .filter(nft => nft.image?.originalUrl || nft.image?.thumbnailUrl)
          .map(nft => ({
            name: nft.name,
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

    console.log(`🔍 Starting CORS validation for ${allNfts.length} candidate NFTs...`);
    
    // Shuffle the NFTs to get a good mix
    const shuffledNfts = allNfts.sort(() => Math.random() - 0.5);
    
    // Validate CORS for NFTs until we have enough valid ones
    const validNfts: CuratedNft[] = [];
    const invalidNfts: CuratedNft[] = [];
    const maxToCheck = Math.min(shuffledNfts.length, requestedCount * 3); // Check up to 3x requested to find enough valid ones
    
    // Batch CORS validation for better performance
    const corsPromises = shuffledNfts.slice(0, maxToCheck).map(async (nft, index) => {
      console.log(`🔗 [${index + 1}/${maxToCheck}] Validating CORS for: ${nft.image}`);
      
      const isValid = await validateImageCors(nft.image, corsTimeout);
      return { ...nft, corsValid: isValid };
    });

    const corsResults = await Promise.allSettled(corsPromises);
    
    corsResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const nft = result.value;
        if (nft.corsValid) {
          validNfts.push(nft);
          console.log(`✅ [${index + 1}] CORS valid: ${nft.name || 'Unnamed'}`);
        } else {
          invalidNfts.push(nft);
          console.log(`❌ [${index + 1}] CORS blocked: ${nft.name || 'Unnamed'}`);
        }
      } else {
        console.warn(`⚠️ [${index + 1}] CORS validation failed:`, result.reason);
      }
    });

    // Take the requested number of valid NFTs
    const finalNfts = validNfts.slice(0, requestedCount);
    
    const result = {
      curatedNfts: finalNfts,
      stats: {
        totalCandidates: allNfts.length,
        corsValidated: maxToCheck,
        corsValid: validNfts.length,
        corsBlocked: invalidNfts.length,
        returned: finalNfts.length,
        processingTimeMs: Date.now() - startTime,
      },
      metadata: {
        addresses,
        requestedCount,
        corsTimeout,
        timestamp: new Date().toISOString(),
      },
    };

    if (finalNfts.length === 0) {
      throw new Error(`No CORS-valid NFTs found. Checked ${maxToCheck} candidates, ${invalidNfts.length} were CORS-blocked`);
    }

    if (finalNfts.length < requestedCount) {
      console.warn(`⚠️ Only found ${finalNfts.length} CORS-valid NFTs out of ${requestedCount} requested`);
    }

    console.log(`🎉 Successfully curated ${finalNfts.length} CORS-valid NFTs in ${Date.now() - startTime}ms`);

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
      message: `Error curating CORS-valid NFTs: ${errorMessage}`,
      ownerAddress: addresses.join(', '),
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