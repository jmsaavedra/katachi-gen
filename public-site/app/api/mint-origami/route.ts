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
  const startTime = Date.now();
  console.log('🚀 [MINT API] Request started:', { timestamp: new Date().toISOString() });
  
  try {
    const body: MintOrigamiRequest = await request.json();
    const { recipientAddress, svgContent, name, description, nftCount, collections, sentimentFilter, stackMedalsCount, curatedNfts } = body;
    
    console.log('📝 [MINT API] Request payload:', {
      recipientAddress,
      nameLength: name?.length || 0,
      svgContentLength: svgContent?.length || 0,
      hasDescription: !!description,
      nftCount,
      collections,
      hasSentimentFilter: !!sentimentFilter,
      stackMedalsCount,
      curatedNftsCount: curatedNfts?.length || 0
    });

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

    const mcpServerUrl = config.mcpServerUrl;
    if (!mcpServerUrl) {
      console.error('❌ [MINT API] MCP server URL not configured:', {
        envVar: 'MCP_SERVER_URL',
        configValue: config.mcpServerUrl
      });
      return NextResponse.json(
        { error: 'MCP server not configured' },
        { status: 500 }
      );
    }

    // Get the next sequential NFT number
    console.log('🔢 [MINT API] Getting next token ID...');
    const nextNftNumber = await getNextTokenId();
    console.log('✅ [MINT API] Next token ID retrieved:', { nextNftNumber });
    
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
      console.log('🎨 [MINT API] Regenerating pattern with final NFT number:', {
        nftCount,
        collections,
        nftNumber: nextNftNumber,
        hasSentimentFilter: !!sentimentFilter,
        hasStackMedals: !!stackMedalsCount,
        hasCuratedNfts: !!curatedNfts?.length
      });
      
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
      
      console.log('✅ [MINT API] Pattern regenerated:', {
        finalName,
        svgLength: finalSvgContent.length,
        traitCount: finalMetadata.traits.length
      });
    } else {
      console.log('ℹ️ [MINT API] Using original SVG content (no regeneration)');
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
    
    console.log('📡 [MINT API] Sending MCP request:', {
      method: mcpRequest.method,
      toolName: mcpRequest.params.name,
      requestId: mcpRequest.id,
      chainId: config.mintChainId,
      tokenId: nextNftNumber,
      recipientAddress,
      mcpServerUrl: config.mcpServerUrl || 'NOT_SET'
    });

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(mcpRequest),
    });

    console.log('📨 [MINT API] MCP server response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      requestDuration: `${Date.now() - startTime}ms`
    });

    if (!response.ok) {
      console.error('❌ [MINT API] MCP server error:', {
        status: response.status,
        statusText: response.statusText,
        url: mcpServerUrl
      });
      throw new Error(`MCP server responded with status: ${response.status}`);
    }

    const mcpResponse = await response.json();
    console.log('✅ [MINT API] MCP server response parsed:', {
      hasResult: !!mcpResponse.result,
      hasError: !!mcpResponse.error,
      resultType: typeof mcpResponse.result,
      requestId: mcpResponse.id
    });

    // Handle JSON-RPC error response
    if (mcpResponse.error) {
      console.error('❌ [MINT API] MCP server returned error:', {
        errorCode: mcpResponse.error.code,
        errorMessage: mcpResponse.error.message,
        requestId: mcpResponse.id
      });
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

    console.log('🎉 [MINT API] Successfully prepared mint transaction:', {
      success: result.success || true,
      hasTransactionData: !!result.transaction,
      hasMetadata: !!result.metadata,
      contractAddress: result.transaction?.to,
      tokenId: result.metadata?.tokenId,
      chainId: result.metadata?.chainId,
      totalDuration: `${Date.now() - startTime}ms`
    });

    return NextResponse.json({
      success: true,
      mintData: result,
    });

  } catch (error) {
    console.error('❌ [MINT API] Error in mint-origami API:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${Date.now() - startTime}ms`
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}