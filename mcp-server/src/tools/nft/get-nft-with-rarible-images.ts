import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { Address, isAddress } from 'viem';
import { RaribleProtocolMcp } from '@rarible/protocol-mcp';
import { config } from '../../config';
import type { ToolErrorOutput } from '../../types';
import { getCached, setCached } from '../../utils/cache';

// Define the output type for NFT with alternative image URIs
export interface NFTWithRaribleImagesOutput {
  tokenId: string;
  contractAddress: Address;
  name: string | null;
  description: string | null;
  // Original metadata image URL (may have CORS issues)
  originalImageUrl: string | null;
  // Rarible-provided alternative image URLs (better CORS compliance)
  raribleImages: {
    preview?: string;      // Small preview image
    big?: string;          // Larger version  
    initial?: string;      // Initial/default size
    original?: string;     // Original image
    portrait?: string;     // Portrait orientation
  };
  // Additional metadata
  attributes: Array<{
    trait_type?: string;
    value?: string | number;
    display_type?: string;
  }>;
  collection?: {
    name?: string;
    address?: string;
  };
  blockchain: string;
  supply: string;
  creators: Array<{
    account: string;
    value: number;
  }>;
  raribleId: string;
  timestamp: string;
}

export const schema = {
  contractAddress: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid contract address',
    })
    .describe('The NFT contract address'),
  tokenId: z
    .string()
    .min(1)
    .describe('The NFT token ID'),
};

export const metadata = {
  name: 'getNFTWithRaribleImages',
  description: 'Get NFT metadata with alternative image URLs from Rarible API for better CORS compliance',
  annotations: {
    title: 'NFT Metadata with Rarible Images',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-analysis',
    educationalHint: true,
    chainableWith: ['interpretCollectionSentiment'],
    cacheTTL: 60 * 10, // 10 minutes
  },
};

function extractImageUrls(content: Array<any>): NFTWithRaribleImagesOutput['raribleImages'] {
  const images: NFTWithRaribleImagesOutput['raribleImages'] = {};
  
  // Find all image content items
  const imageContent = content.filter(item => 
    item.atType === 'IMAGE' || 
    item.mimeType?.startsWith('image/') ||
    item.representation
  );
  
  for (const item of imageContent) {
    if (item.url && item.representation) {
      const rep = item.representation.toLowerCase();
      if (rep === 'preview') {
        images.preview = item.url;
      } else if (rep === 'big') {
        images.big = item.url;
      } else if (rep === 'initial') {
        images.initial = item.url;
      } else if (rep === 'original') {
        images.original = item.url;
      } else if (rep === 'portrait') {
        images.portrait = item.url;
      }
    }
  }
  
  return images;
}

export default async function getNFTWithRaribleImages({ 
  contractAddress, 
  tokenId 
}: InferSchema<typeof schema>) {
  const cacheKey = `mcp:nftRaribleImages:${config.chainId}:${contractAddress.toLowerCase()}:${tokenId}`;
  const cached = await getCached(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const raribleApiKey = config.raribleApiKey;
    if (!raribleApiKey) {
      const errorOutput: ToolErrorOutput = {
        error: true,
        message: 'RARIBLE_API_KEY environment variable is required to access Rarible API',
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(errorOutput, null, 2),
          },
        ],
      };
    }

    const rarible = new RaribleProtocolMcp({
      apiKeyAuth: raribleApiKey,
    });

    // Construct Rarible NFT ID format: BLOCKCHAIN:CONTRACT:TOKEN_ID
    const chainPrefix = config.chainId === 360 ? 'SHAPE' : 'SHAPE'; // Both use SHAPE for now
    const raribleId = `${chainPrefix}:${contractAddress}:${tokenId}`;

    console.log(`🔍 Fetching NFT metadata from Rarible for: ${raribleId}`);

    const itemResponse = await rarible.nftItems.getItemById({
      itemId: raribleId,
    });

    if (!itemResponse) {
      const errorOutput: ToolErrorOutput = {
        error: true,
        message: `No NFT data found for contract ${contractAddress} token ${tokenId} on Rarible`,
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(errorOutput, null, 2),
          },
        ],
      };
    }

    // Extract image URLs from content
    const content = itemResponse.meta?.content || [];
    const raribleImages = extractImageUrls(content);

    // Process attributes
    const attributes = (itemResponse.meta?.attributes || []).map(attr => ({
      trait_type: attr.key || undefined,
      value: attr.value || undefined,
      display_type: attr.type || undefined,
    }));

    // Process creators
    const creators = (itemResponse.creators || []).map(creator => ({
      account: creator.account || '',
      value: creator.value || 0,
    }));

    const result: NFTWithRaribleImagesOutput = {
      tokenId,
      contractAddress,
      name: itemResponse.meta?.name || null,
      description: itemResponse.meta?.description || null,
      originalImageUrl: null, // We don't have the original metadata URL here
      raribleImages,
      attributes,
      collection: {
        name: itemResponse.itemCollection?.name || undefined,
        address: itemResponse.contract?.replace(/^SHAPE:/, '') || contractAddress,
      },
      blockchain: itemResponse.blockchain || 'SHAPE',
      supply: itemResponse.supply || '1',
      creators,
      raribleId,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Found ${Object.keys(raribleImages).length} alternative image URLs from Rarible`);

    const response = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

    await setCached(cacheKey, JSON.stringify(response), metadata.annotations.cacheTTL);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching NFT from Rarible:`, error);
    
    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Failed to fetch NFT metadata from Rarible: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(errorOutput, null, 2),
        },
      ],
    };
  }
}