import { encodeFunctionData, isAddress, zeroAddress } from 'viem';
import { addresses } from '../../addresses';
import { abi as nftMinterAbi } from '../../abi/nftMinter';
import type { ToolErrorOutput, PrepareMintSVGNFTOutput } from '../../types';
import { shape, shapeSepolia } from 'viem/chains';
import { InferSchema } from 'xmcp';
import { z } from 'zod';
import { config } from '../../config';

export const schema = {
  recipientAddress: z
    .string()
    .refine((address) => isAddress(address), {
      message: 'Invalid address',
    })
    .describe('The wallet address to mint the NFT to'),
  svgContent: z.string().optional().describe('SVG content for the NFT (optional if using Arweave URLs)'),
  name: z.string().describe('NFT name'),
  description: z.string().optional().describe('NFT description (optional)'),
  image: z.string().optional().describe('Image URL (Arweave or other) - overrides SVG content if provided'),
  animation_url: z.string().optional().describe('Animation URL (Arweave HTML) for interactive content'),
  tokenId: z.number().optional().describe('Specific token ID to use (optional, defaults to auto-generated)'),
  chainId: z.number().optional().describe('Chain ID to mint on (defaults to configured chain)'),
  metadata: z.object({
    traits: z.array(z.object({
      trait_type: z.string(),
      value: z.union([z.string(), z.number()]),
    })).optional(),
    curatedNfts: z.array(z.object({
      name: z.string(),
      description: z.string(),
      image: z.string(),
      contractAddress: z.string(),
      tokenId: z.string(),
    })).optional(),
  }).optional().describe('Additional NFT metadata following specification (optional)'),
};

export const metadata = {
  name: 'prepareMintSVGNFT',
  description: 'Prepare transaction data for minting an SVG NFT on Shape network (mainnet or testnet)',
  annotations: {
    category: 'NFT',
    requiresAuth: false,
    network: 'shape',
    cacheTTL: 0,
  },
};

export default async function prepareMintSVGNFT(params: InferSchema<typeof schema>) {
  const startTime = Date.now();
  console.log('🚀 [MCP SERVER] prepareMintSVGNFT called:', { 
    timestamp: new Date().toISOString(),
    requestedChainId: params.chainId,
    providedTokenId: params.tokenId,
    recipient: params.recipientAddress
  });
  
  try {
    const {
      recipientAddress,
      svgContent,
      name,
      description = 'NFT created via Shape MCP Server',
      image: providedImage,
      animation_url: providedAnimationUrl,
      tokenId: providedTokenId,
      chainId: requestedChainId,
      metadata: additionalMetadata,
    } = params;
    
    console.log('📝 [MCP SERVER] Processing parameters:', {
      recipientAddress,
      nameLength: name?.length || 0,
      svgContentLength: svgContent?.length || 0,
      hasProvidedImage: !!providedImage,
      hasAnimationUrl: !!providedAnimationUrl,
      hasAdditionalMetadata: !!additionalMetadata,
      providedTokenId,
      requestedChainId
    });

    const chainId = requestedChainId ?? config.mintChainId;
    const contractAddress = addresses.nftMinter[chainId];
    const isMainnet = chainId === shape.id;

    if (!contractAddress || contractAddress === zeroAddress) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'NFT_CONTRACT_NOT_DEPLOYED',
              message: `NFT minter contract not available on chain ${chainId}`,
            }),
          },
        ],
      };
    }

    // Validate that we have either image URL or SVG content
    if (!providedImage && !svgContent) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'MISSING_IMAGE_CONTENT',
              message: 'Either image URL or svgContent must be provided',
            }),
          },
        ],
      };
    }

    // Create clean metadata following the specification
    const nftMetadata = {
      name,
      description,
      image: providedImage || `data:image/svg+xml;base64,${Buffer.from(svgContent || '').toString('base64')}`,
      ...(providedAnimationUrl && { animation_url: providedAnimationUrl }),
      attributes: additionalMetadata?.traits || [],
      ...(additionalMetadata?.curatedNfts && { curatedNfts: additionalMetadata.curatedNfts }),
    };

    console.log('📦 [MCP SERVER] Creating NFT metadata:', {
      name,
      descriptionLength: description.length,
      imageSource: providedImage ? 'arweave_url' : 'svg_base64',
      imageValue: providedImage || `data:image/svg+xml;base64,${Buffer.from(svgContent || '').toString('base64')}`,
      hasAnimationUrl: !!providedAnimationUrl,
      animationUrl: providedAnimationUrl,
      attributeCount: additionalMetadata?.traits?.length || 0,
      hasCuratedNfts: !!additionalMetadata?.curatedNfts?.length
    });

    const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;

    // Use provided token ID or generate a random one as fallback
    const tokenId = providedTokenId ?? (Date.now() + Math.floor(Math.random() * 1000));
    
    console.log('🎫 [MCP SERVER] Token configuration:', {
      tokenId,
      wasProvided: !!providedTokenId,
      tokenUriLength: tokenURI.length
    });

    const transactionData = {
      to: contractAddress,
      data: encodeFunctionData({
        abi: nftMinterAbi,
        functionName: 'safeMintWithURI',
        args: [recipientAddress, BigInt(tokenId), tokenURI],
      }),
      value: '0x0', // No ETH value needed
    };

    const result: PrepareMintSVGNFTOutput = {
      success: true,
      transaction: transactionData,
      metadata: {
        contractAddress,
        functionName: 'safeMintWithURI',
        recipientAddress,
        tokenId: tokenId.toString(),
        tokenURI,
        nftMetadata: nftMetadata,
        estimatedGas: '150000', // Increased for safeMintWithURI
        chainId,
        explorerUrl: `https://${isMainnet ? '' : 'sepolia.'}shapescan.xyz/address/${contractAddress}`,
      },
      instructions: {
        nextSteps: [
          'Use your wallet to execute this transaction',
          'The NFT will be minted to the specified recipient address',
          `Check the transaction on ${isMainnet ? 'Shape Mainnet' : 'Shape Sepolia'} explorer`,
        ],
      },
    };

    console.log('🎉 [MCP SERVER] Transaction prepared successfully:', {
      contractAddress,
      functionName: 'safeMintWithURI',
      chainId,
      tokenId: tokenId.toString(),
      recipientAddress,
      dataLength: transactionData.data.length,
      estimatedGas: result.metadata.estimatedGas,
      processingTime: `${Date.now() - startTime}ms`
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error('❌ [MCP SERVER] Error in prepareMintSVGNFT:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${Date.now() - startTime}ms`,
      params: {
        recipientAddress: params.recipientAddress,
        chainId: params.chainId,
        tokenId: params.tokenId
      }
    });

    const errorOutput: ToolErrorOutput = {
      error: true,
      message: `Error preparing mint transaction: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`,
      ownerAddress: params.recipientAddress,
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
