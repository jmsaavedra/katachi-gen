import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

type GetStackMedalsRequest = {
  userAddress: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: GetStackMedalsRequest = await request.json();
    const { userAddress } = body;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address' },
        { status: 400 }
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