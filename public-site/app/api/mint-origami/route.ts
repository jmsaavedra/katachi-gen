import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { chainConfig } from '@/lib/chains';
import { config } from '@/lib/config';
import { shape } from 'viem/chains';

type MintOrigamiRequest = {
  recipientAddress: string;
  svgContent: string;
  name: string;
  description?: string;
};


export async function POST(request: NextRequest) {
  try {
    const body: MintOrigamiRequest = await request.json();
    const { recipientAddress, svgContent, name, description } = body;

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

    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'prepareMintSVGNFT',
        arguments: {
          recipientAddress,
          svgContent,
          name,
          description: description || `Katachi Gen origami pattern - ${name}`,
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