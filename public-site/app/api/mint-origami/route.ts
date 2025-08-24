import { NextRequest, NextResponse } from 'next/server';
import { isAddress, parseAbi } from 'viem';
import { config } from '@/lib/config';
import { shape, shapeSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import { generatePlaceholderPattern } from '@/utils/generatePlaceholderSVG';

type MintOrigamiRequest = {
  recipientAddress: string;
  svgContent: string;
  name: string;
  description?: string;
  // New fields for pattern regeneration with correct numbering
  nftCount?: number;
  collections?: number;
  sentimentFilter?: string;
  stackMedalsCount?: number;
  curatedNfts?: Array<{
    name: string;
    description: string;
    image: string;
    contractAddress: string;
    tokenId: string;
  }>;
};


// ERC-721 Enumerable ABI for totalSupply function
const erc721EnumerableAbi = parseAbi([
  'function totalSupply() view returns (uint256)'
]);

// Get next token ID by querying contract's totalSupply (now supported!)
async function getNextTokenId(): Promise<number> {
  const chainId = config.mintChainId;
  const chain = chainId === shape.id ? shape : shapeSepolia;
  const contractAddress = chainId === shape.id ? config.katachiContractMainnet : config.katachiContractTestnet;
  
  const client = createPublicClient({
    chain,
    transport: http(`https://${chainId === shape.id ? 'shape-mainnet' : 'shape-sepolia'}.g.alchemy.com/v2/${config.alchemyKey}`),
  });

  try {
    const totalSupply = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: erc721EnumerableAbi,
      functionName: 'totalSupply',
    });
    
    // Return totalSupply + 1 as the next NFT number (truly sequential!)
    const nextTokenId = Number(totalSupply) + 1;
    console.log(`Contract totalSupply: ${totalSupply}, Next tokenId: ${nextTokenId}`);
    return nextTokenId;
  } catch (error) {
    console.error('Error reading totalSupply from ERC721Enumerable contract:', error);
    // Fallback - should not happen with ERC721Enumerable
    return Math.floor(Math.random() * 9999) + 1;
  }
}


export async function POST(request: NextRequest) {
  try {
    const body: MintOrigamiRequest = await request.json();
    const { recipientAddress, svgContent, name, description, nftCount, collections, sentimentFilter, stackMedalsCount, curatedNfts } = body;

    if (!recipientAddress || !isAddress(recipientAddress)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    if (!svgContent || !svgContent.trim()) {
      return NextResponse.json(
        { error: 'SVG content is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'NFT name is required' },
        { status: 400 }
      );
    }

    // Safety check: prevent accidental mainnet minting
    if (config.mintChainId === shape.id && !config.allowMainnetMinting) {
      return NextResponse.json(
        { 
          error: 'Mainnet minting is disabled for safety',
          details: 'Set NEXT_PUBLIC_ALLOW_MAINNET_MINTING=true to enable mainnet minting'
        },
        { status: 403 }
      );
    }

    const mcpServerUrl = process.env.MCP_SERVER_URL;
    if (!mcpServerUrl) {
      return NextResponse.json(
        { error: 'MCP server not configured' },
        { status: 500 }
      );
    }

    // Get the next sequential NFT number
    const nextNftNumber = await getNextTokenId();
    
    // If pattern data is provided, regenerate with correct NFT number
    let finalSvgContent = svgContent;
    let finalName = name;
    let finalDescription = description || `Katachi Gen origami pattern - ${name}`;
    let finalMetadata: {
      traits: Array<{ trait_type: string; value: string | number }>;
      curatedNfts?: Array<{
        name: string;
        description: string;
        image: string;
        contractAddress: string;
        tokenId: string;
      }>;
    } | undefined;
    
    if (nftCount !== undefined && collections !== undefined) {
      const regeneratedPattern = generatePlaceholderPattern({
        nftCount,
        collections,
        walletAddress: recipientAddress,
        nftNumber: nextNftNumber,
        sentimentFilter,
        stackMedalsCount,
        curatedNfts,
      });
      
      finalSvgContent = regeneratedPattern.svgContent;
      finalName = regeneratedPattern.metadata.name;
      finalDescription = regeneratedPattern.metadata.description;
      finalMetadata = {
        traits: regeneratedPattern.metadata.traits,
        ...(regeneratedPattern.metadata.curatedNfts && { curatedNfts: regeneratedPattern.metadata.curatedNfts }),
      };
    }

    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'prepareMintSVGNFT',
        arguments: {
          recipientAddress,
          svgContent: finalSvgContent,
          name: finalName,
          description: finalDescription,
          tokenId: nextNftNumber,
          chainId: config.mintChainId,
          ...(finalMetadata && { metadata: finalMetadata }),
        },
      },
      id: Date.now(),
    };

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!response.ok) {
      throw new Error(`MCP server responded with status: ${response.status}`);
    }

    const mcpResponse = await response.json();

    // Handle JSON-RPC error response
    if (mcpResponse.error) {
      return NextResponse.json(
        { 
          error: 'MCP server error',
          details: mcpResponse.error.message || 'Unknown error from MCP server'
        },
        { status: 500 }
      );
    }

    // Extract result from JSON-RPC response
    let result = mcpResponse.result;
    if (mcpResponse.result && mcpResponse.result.content && mcpResponse.result.content[0] && mcpResponse.result.content[0].text) {
      try {
        result = JSON.parse(mcpResponse.result.content[0].text);
      } catch (e) {
        console.warn('Could not parse MCP response as JSON:', e);
        result = mcpResponse.result;
      }
    }

    // Check if the parsed result indicates an error
    if (result.error) {
      return NextResponse.json(
        { 
          error: 'MCP server error',
          details: result.message || 'Unknown error from MCP server'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mintData: result,
    });

  } catch (error) {
    console.error('Error in mint-origami API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}