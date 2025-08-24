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
  svgContent: z.string().describe('SVG content for the NFT'),
  name: z.string().describe('NFT name'),
  description: z.string().optional().describe('NFT description (optional)'),
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
  try {
    const {
      recipientAddress,
      svgContent,
      name,
      description = 'SVG NFT created via Shape MCP Server',
      tokenId: providedTokenId,
      chainId: requestedChainId,
      metadata: additionalMetadata,
    } = params;

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

    // Create clean metadata following the specification (no system attributes, no extra fields)
    const nftMetadata = {
      name,
      description,
      image: `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`,
      attributes: additionalMetadata?.traits || [],
      ...(additionalMetadata?.curatedNfts && { curatedNfts: additionalMetadata.curatedNfts }),
    };

    const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;

    // Use provided token ID or generate a random one as fallback
    const tokenId = providedTokenId ?? (Date.now() + Math.floor(Math.random() * 1000));

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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
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
