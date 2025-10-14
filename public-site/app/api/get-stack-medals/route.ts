import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withRelatedProject } from '@vercel/related-projects';

type GetStackMedalsRequest = {
  userAddress: string;
};

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    // Parse body with better error handling for empty requests
    let body: GetStackMedalsRequest;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        console.warn('[get-stack-medals] Empty request body received, returning 400');
        return NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (e) {
      console.error('[get-stack-medals] Invalid JSON in request body:', e);
      return NextResponse.json(
        { error: 'Invalid or empty request body' },
        { status: 400 }
      );
    }

    const { userAddress } = body;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address' },
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
        name: 'getStackAchievements',
        arguments: {
          userAddress,
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
      data: result,
    });

  } catch (error) {
    console.error('Error in get-stack-medals API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}