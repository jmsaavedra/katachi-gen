import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withRelatedProject } from '@vercel/related-projects';

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

/**
 * API endpoint to fetch NFTs with server-side caching (via MCP server)
 * GET /api/get-prefetched-nfts?address=0x...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    // Automatically resolves to the correct MCP server URL based on environment
    const mcpServerUrl = withRelatedProject({
      projectName: 'katachi-gen-mcp-server',
      defaultHost: process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp',
    }) + '/mcp';

    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'getPrefetchedNfts',
        arguments: {
          userAddress: address,
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

    // Debug: Log the full MCP response structure
    console.log('MCP Response:', JSON.stringify(mcpResponse, null, 2));

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
        console.log('Attempting to parse content[0].text:', mcpResponse.result.content[0].text.substring(0, 200));
        result = JSON.parse(mcpResponse.result.content[0].text);
      } catch (e) {
        console.error('Could not parse MCP response as JSON:', e);
        console.error('Full text content:', mcpResponse.result.content[0].text);
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
      data: result,
      address
    });

  } catch (error) {
    console.error('Error in get-prefetched-nfts API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
