import { createWalletClient, http, encodeFunctionData, isAddress } from 'viem';
import { addresses } from '../../addresses';
import { abi as katachiGenV4Abi } from '../../abi/katachiGenV4';
import { shape, shapeSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { InferSchema } from 'xmcp';
import { z } from 'zod';
import { config } from '../../config';

export const schema = {
  tokenId: z.number().describe('Token ID to set URI for'),
  tokenURI: z.string().describe('Token URI (data URI or Arweave URL)'),
  chainId: z.number().optional().describe('Chain ID (defaults to configured chain)'),
};

export const metadata = {
  name: 'setTokenURI',
  description: 'Set metadata URI for an existing NFT token using minter role',
  annotations: {
    category: 'NFT',
    requiresAuth: false,
    network: 'shape',
    cacheTTL: 0,
  },
};

export default async function setTokenURI(params: InferSchema<typeof schema>) {
  const startTime = Date.now();
  console.log('🔧 [MCP SERVER] setTokenURI called:', { 
    timestamp: new Date().toISOString(),
    tokenId: params.tokenId,
    chainId: params.chainId,
    tokenURILength: params.tokenURI.length
  });
  
  try {
    const { tokenId, tokenURI, chainId: requestedChainId } = params;

    const chainId = requestedChainId ?? config.mintChainId;
    const contractAddress = addresses.nftMinter[chainId];
    const isMainnet = chainId === shape.id;

    if (!contractAddress) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'CONTRACT_NOT_FOUND',
              message: `Contract not found for chain ${chainId}`,
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

      console.log('📝 [MCP SERVER] Setting token URI:', {
        minterAddress: minterAccount.address,
        contractAddress,
        tokenId,
        chainId
      });

      // Execute setTokenURI transaction
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: katachiGenV4Abi,
        functionName: 'setTokenURI',
        args: [BigInt(tokenId), tokenURI],
      });

      const result = {
        success: true,
        transactionHash: hash,
        metadata: {
          tokenId: tokenId.toString(),
          contractAddress,
          minterAddress: minterAccount.address,
          chainId,
          explorerUrl: `https://${isMainnet ? '' : 'sepolia.'}shapescan.xyz/tx/${hash}`,
          tokenURI,
        },
        instructions: {
          nextSteps: [
            'Transaction submitted successfully',
            'Token URI has been set for the NFT',
            `View transaction: https://${isMainnet ? '' : 'sepolia.'}shapescan.xyz/tx/${hash}`,
          ],
        },
      };

      console.log('✅ [MCP SERVER] Token URI set successfully:', {
        transactionHash: hash,
        tokenId: tokenId.toString(),
        contractAddress,
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

    } catch (txError) {
      console.error('❌ [MCP SERVER] Transaction error:', txError);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'TRANSACTION_FAILED',
              message: `Failed to set token URI: ${txError instanceof Error ? txError.message : 'Unknown error'}`,
              tokenId: tokenId.toString(),
              contractAddress,
            }, (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
            ),
          },
        ],
      };
    }
    
  } catch (error) {
    console.error('❌ [MCP SERVER] Error in setTokenURI:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${Date.now() - startTime}ms`
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'UNKNOWN_ERROR',
            message: `Error setting token URI: ${
              error instanceof Error ? error.message : 'Unknown error occurred'
            }`,
            tokenId: params.tokenId.toString(),
            timestamp: new Date().toISOString(),
          }, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          ),
        },
      ],
    };
  }
}