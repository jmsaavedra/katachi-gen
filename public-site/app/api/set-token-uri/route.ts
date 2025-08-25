import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

type SetTokenURIRequest = {
  tokenId: number;
  tokenURI: string;
  chainId: number;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔧 [SET_TOKEN_URI API] Request started:', { timestamp: new Date().toISOString() });
  
  try {
    const body: SetTokenURIRequest = await request.json();
    const { tokenId, tokenURI, chainId } = body;
    
    console.log('📝 [SET_TOKEN_URI API] Request payload:', {
      tokenId,
      tokenURILength: tokenURI?.length || 0,
      chainId
    });

    if (!tokenId || tokenId < 1) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    if (!tokenURI || !tokenURI.trim()) {
      return NextResponse.json(
        { error: 'Token URI is required' },
        { status: 400 }
      );
    }

    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      );
    }

    const mcpServerUrl = config.mcpServerUrl;
    if (!mcpServerUrl) {
      console.error('❌ [SET_TOKEN_URI API] MCP server URL not configured');
      return NextResponse.json(
        { error: 'MCP server not configured' },
        { status: 500 }
      );
    }

    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'setTokenURI',
        arguments: {
          tokenId,
          tokenURI,
          chainId,
        },
      },
      id: Date.now(),
    };
    
    console.log('📡 [SET_TOKEN_URI API] Sending MCP request:', {
      method: mcpRequest.method,
      toolName: mcpRequest.params.name,
      tokenId,
      chainId,
      mcpServerUrl
    });

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(mcpRequest),
    });

    console.log('📨 [SET_TOKEN_URI API] MCP server response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      requestDuration: `${Date.now() - startTime}ms`
    });

    if (!response.ok) {
      console.error('❌ [SET_TOKEN_URI API] MCP server error:', {
        status: response.status,
        statusText: response.statusText,
        url: mcpServerUrl
      });
      throw new Error(`MCP server responded with status: ${response.status}`);
    }

    const mcpResponse = await response.json();
    console.log('✅ [SET_TOKEN_URI API] MCP server response parsed:', {
      hasResult: !!mcpResponse.result,
      hasError: !!mcpResponse.error,
      requestId: mcpResponse.id
    });

    // Handle JSON-RPC error response
    if (mcpResponse.error) {
      console.error('❌ [SET_TOKEN_URI API] MCP server returned error:', {
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

    console.log('🎉 [SET_TOKEN_URI API] Successfully set token URI:', {
      success: result.success || true,
      tokenId,
      transactionHash: result.transactionHash,
      totalDuration: `${Date.now() - startTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('❌ [SET_TOKEN_URI API] Error:', {
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