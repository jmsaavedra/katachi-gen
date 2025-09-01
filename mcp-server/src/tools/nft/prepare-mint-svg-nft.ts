import { encodeFunctionData, isAddress, zeroAddress, createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { addresses } from '../../addresses';
import { abi as katachiGenV4Abi } from '../../abi/katachiGenV4';
import type { ToolErrorOutput, PrepareMintSVGNFTOutput } from '../../types';
import { shape, shapeSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
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
      image: z.string(),
      contractAddress: z.string(),
      tokenId: z.string(),
    })).optional(),
  }).optional().describe('Additional NFT metadata following specification (optional)'),
};

export const metadata = {
  name: 'prepareMintSVGNFT',
  description: 'Complete two-step NFT minting: mint NFT and set metadata URI using minter role',
  annotations: {
    category: 'NFT',
    requiresAuth: false,
    network: 'shape',
    cacheTTL: 0,
  },
};

export default async function prepareMintSVGNFT(params: InferSchema<typeof schema>) {
  const startTime = Date.now();
  console.log('🚀 [MCP SERVER] prepareMintSVGNFT V4 called:', { 
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

    const chainId = requestedChainId ?? config.mintChainId;
    const contractAddress = addresses.nftMinter[chainId];
    const isMainnet = chainId === shape.id;
    
    console.log('🔍 [MCP SERVER] Contract address resolution:', {
      requestedChainId,
      configMintChainId: config.mintChainId,
      finalChainId: chainId,
      isMainnet,
      contractAddress,
      envTestnet: process.env.KATACHI_CONTRACT_TESTNET,
      envMainnet: process.env.KATACHI_CONTRACT_MAINNET,
      availableChainIds: Object.keys(addresses.nftMinter)
    });

    if (!contractAddress || contractAddress === zeroAddress) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'NFT_CONTRACT_NOT_DEPLOYED',
              message: `NFT minter contract not available on chain ${chainId}`,
              availableChains: Object.keys(addresses.nftMinter),
              contractAddress
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

    // Check if minter private key is available
    const minterPrivateKey = process.env.MINTER_WALLET_PRIVATE_KEY;
    if (!minterPrivateKey) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'MINTER_WALLET_NOT_CONFIGURED',
              message: 'MINTER_WALLET_PRIVATE_KEY environment variable not set',
            }),
          },
        ],
      };
    }

    // Format private key properly
    const formattedPrivateKey = minterPrivateKey.startsWith('0x') 
      ? minterPrivateKey 
      : `0x${minterPrivateKey}`;
    
    // Validate private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedPrivateKey)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'INVALID_PRIVATE_KEY_FORMAT',
              message: 'Private key must be 64 hex characters (with or without 0x prefix)',
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

    // For now, we'll prepare the metadata for Arweave upload after mint confirmation
    // Instead of creating base64 data URI immediately
    console.log('📦 [MCP SERVER] Preparing NFT metadata for deferred Arweave upload:', {
      name,
      descriptionLength: description.length,
      imageSource: providedImage ? 'arweave_url' : 'svg_base64',
      hasAnimationUrl: !!providedAnimationUrl,
      attributeCount: additionalMetadata?.traits?.length || 0,
      metadataSize: JSON.stringify(nftMetadata).length
    });

    try {
      // Set up minter wallet
      const minterAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      const chain = chainId === shape.id ? shape : shapeSepolia;
      const rpcUrl = chainId === shape.id 
        ? 'https://mainnet.shape.network'
        : 'https://sepolia.shape.network';
      
      const walletClient = createWalletClient({
        account: minterAccount,
        chain,
        transport: http(rpcUrl),
      });

      console.log('💳 [MCP SERVER] Minter wallet configured:', {
        minterAddress: minterAccount.address,
        chainId,
        contractAddress,
        isMainnet,
        chainName: isMainnet ? 'Shape Mainnet' : 'Shape Sepolia'
      });

      // Step 1: Get the actual next token ID from contract
      console.log('📊 [MCP SERVER] Reading totalSupply from contract...');
      
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });
      
      let nextTokenId: number;
      try {
        const totalSupply = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: katachiGenV4Abi,
          functionName: 'totalSupply',
        }) as bigint;
        
        nextTokenId = Number(totalSupply) + 1;
        console.log('✅ [MCP SERVER] Contract totalSupply read:', {
          totalSupply: totalSupply.toString(),
          nextTokenId
        });
      } catch (totalSupplyError) {
        console.error('❌ [MCP SERVER] Failed to read totalSupply:', totalSupplyError);
        // Fallback to timestamp-based ID if contract read fails
        nextTokenId = Date.now() % 10000;
        console.log('⚠️ [MCP SERVER] Using fallback token ID:', nextTokenId);
      }

      // Step 2: Prepare mint transaction
      const mintData = encodeFunctionData({
        abi: katachiGenV4Abi,
        functionName: 'mint',
        args: [BigInt(1)], // quantity = 1
      });

      // Get current mint price from contract
      const mintPrice = parseEther('0.0025'); // Default 0.0025 ETH

      const mintTransaction = {
        to: contractAddress,
        data: mintData,
        value: `0x${mintPrice.toString(16)}`,
        gas: '0x' + (150000).toString(16), // Set reasonable gas limit: 150k gas
      };
      
      console.log('🎯 [MCP SERVER] Mint transaction prepared:', {
        to: contractAddress,
        value: `${mintPrice.toString()} wei (0.0025 ETH)`,
        gas: '150000 gas',
        dataLength: mintData.length
      });

      // Step 2: After mint, we'll automatically set the tokenURI
      // We need to estimate what the next token ID will be
      // For now, we'll return instructions for the two-step process

      const result = {
        success: true,
        mintTransaction: mintTransaction,
        metadata: {
          contractAddress,
          recipientAddress,
          tokenId: nextTokenId.toString(),
          chainId,
          mintPrice: mintPrice.toString(),
          explorerUrl: `https://${isMainnet ? '' : 'sepolia.'}shapescan.xyz/address/${contractAddress}`,
          minterAddress: minterAccount.address,
          // Remove tokenURI and nftMetadata from here - will be set after Arweave upload
        },
        pendingMetadataJson: nftMetadata, // ← NEW: Metadata ready for Arweave upload
        instructions: {
          nextSteps: [
            '1. User executes the mint transaction (pays 0.0025 ETH)',
            '2. System uploads metadata to Arweave after mint confirmation',
            '3. System automatically sets tokenURI with Arweave URL',
            `Check transactions on ${isMainnet ? 'Shape Mainnet' : 'Shape Sepolia'} explorer`,
          ],
          note: 'This is a three-step process: mint → upload metadata to Arweave → setTokenURI (automated)',
        },
      };

      console.log('🎉 [MCP SERVER] Three-step mint prepared (deferred metadata upload):', {
        contractAddress,
        chainId,
        mintPrice: mintPrice.toString(),
        minterAddress: minterAccount.address,
        metadataSize: JSON.stringify(nftMetadata).length,
        processingTime: `${Date.now() - startTime}ms`
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            , 2),
          },
        ],
      };

    } catch (walletError) {
      console.error('❌ [MCP SERVER] Wallet setup error:', walletError);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'WALLET_SETUP_ERROR',
              message: `Failed to set up minter wallet: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`,
            }, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            ),
          },
        ],
      };
    }
    
  } catch (error) {
    console.error('❌ [MCP SERVER] Error in prepareMintSVGNFT:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${Date.now() - startTime}ms`
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
          text: JSON.stringify(errorOutput, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          , 2),
        },
      ],
    };
  }
}
