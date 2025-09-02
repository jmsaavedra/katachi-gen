import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { NftOrdering, OwnedNftsResponse } from 'alchemy-sdk';
import { alchemy } from '../../clients';
import { config } from '../../config';
import type { ShapeNftOutput, ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';
import fs from 'fs';
import path from 'path';

// Load blocked contracts from file with graceful fallback
function loadBlockedContracts(): string[] {
  // Hardcoded fallback list
  const FALLBACK_CONTRACTS = [
    '0x274b9f633e968a31e8f9831308170720d1072135',
    '0x0602b0fad4d305b2c670808dd9f77b0a68e36c5b',
  ];

  try {
    const filePath = path.join(process.cwd(), 'blocked-contracts.txt');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    const contractsFromFile = fileContent
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('#'))
      .map(addr => addr.trim().toLowerCase());
    
    console.log(`✅ Loaded ${contractsFromFile.length} blocked contracts from file`);
    return contractsFromFile;
    
  } catch (error) {
    console.warn('⚠️ Could not load blocked-contracts.txt, using fallback list:', (error as Error).message);
    return FALLBACK_CONTRACTS.map(addr => addr.toLowerCase());
  }
}

// Blocked contract addresses - NFTs from these contracts will be filtered out
const BLOCKED_CONTRACTS = loadBlockedContracts();

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
  address: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid address',
    })
    .describe('The wallet address to get NFTs for'),
  pageKey: z
    .string()
    .optional()
    .describe('Optional page key from previous response to get next page of results'),
  pageSize: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of NFTs to return per page (1-100, default: 100)'),
};

export const metadata = {
  name: 'getShapeNft',
  description: 'Get NFT ownership data for a given address with pagination support.',
  annotations: {
    title: 'Get Shape NFTs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: true,
    chainableWith: ['getCollectionAnalytics'],
    cacheTTL: 60 * 10, // 10 minutes
  },
};

export default async function getShapeNft({ address, pageKey, pageSize }: InferSchema<typeof schema>) {
  const actualPageSize = pageSize || 100;
  const cacheKey = `mcp:shapeNft:${config.chainId}:${address.toLowerCase()}:${pageKey || 'first'}:${actualPageSize}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const nftsResponse: OwnedNftsResponse = await retryWithBackoff(async () => {
      return await alchemy.nft.getNftsForOwner(address, {
        pageSize: actualPageSize,
        pageKey: pageKey,
        omitMetadata: false,
        orderBy: NftOrdering.TRANSFERTIME,
        excludeFilters: [],
      });
    });

    // Filter out blocked contracts before processing
    const filteredNfts = nftsResponse.ownedNfts.filter(nft => {
      const contractAddress = nft.contract.address.toLowerCase();
      if (BLOCKED_CONTRACTS.includes(contractAddress)) {
        console.log(`🚫 Skipped blocked contract NFT: ${nft.name || 'Unnamed'} from ${contractAddress}`);
        return false;
      }
      return true;
    });

    const result: ShapeNftOutput = {
      ownerAddress: address,
      timestamp: new Date().toISOString(),
      totalNfts: filteredNfts.length,
      nfts: filteredNfts.map((nft) => ({
        tokenId: nft.tokenId,
        contractAddress: nft.contract.address as Address,
        name: nft.name || null,
        imageUrl: nft.image?.originalUrl || nft.image?.thumbnailUrl || null,
      })),
      pagination: {
        currentPage: pageKey ? parseInt(pageKey.split(':')[1] || '1') : 1,
        pageSize: actualPageSize,
        hasNextPage: !!nftsResponse.pageKey,
        nextPageKey: nftsResponse.pageKey,
        totalReturned: nftsResponse.ownedNfts.length,
      },
    };

    // Add collection summary for current page (using filtered NFTs)
    const collections = new Map<string, { count: number, name: string | null }>();
    filteredNfts.forEach(nft => {
      const addr = nft.contract.address;
      const existing = collections.get(addr) || { count: 0, name: nft.contract.name || null };
      collections.set(addr, { count: existing.count + 1, name: existing.name });
    });

    // Only include collection summary if we have collections in current page
    if (collections.size > 0) {
      result.collections = Array.from(collections.entries()).map(([address, info]) => ({
        contractAddress: address as Address,
        name: info.name,
        ownedCount: info.count
      }));
    }

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
    const isRateLimit = errorMessage.includes('429');
    
    const errorOutput: ToolErrorOutput = {
      error: true,
      message: isRateLimit 
        ? `Rate limited by Alchemy API. Please try again in a few moments. Original error: ${errorMessage}`
        : `Error fetching NFTs: ${errorMessage}`,
      ownerAddress: address,
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
