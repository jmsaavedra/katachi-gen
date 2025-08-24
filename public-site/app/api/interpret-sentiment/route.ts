import { NextRequest, NextResponse } from 'next/server';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://katachi-gen-mcp-server.vercel.app/mcp';

export async function POST(request: NextRequest) {
  try {
    const { address, sentiment, count } = await request.json();

    if (!address || !sentiment || !count) {
      return NextResponse.json(
        { error: true, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Make request to MCP server
    const payload = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'interpretCollectionSentiment',
        arguments: {
          address,
          sentiment,
          count
        }
      },
      id: Date.now()
    };

    console.log('Calling MCP server with payload:', payload);

    const response = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('MCP server error:', response.status, response.statusText);
      throw new Error(`MCP server returned ${response.status}`);
    }

    const data = await response.json();
    console.log('MCP server response:', data);

    // Handle MCP response format
    if (data.error) {
      return NextResponse.json(
        { error: true, message: data.error.message },
        { status: 500 }
      );
    }

    // Extract the actual result from MCP response format
    let result = data.result;
    if (data.result && data.result.content && data.result.content[0] && data.result.content[0].text) {
      try {
        result = JSON.parse(data.result.content[0].text);
      } catch (e) {
        console.warn('Could not parse MCP response as JSON:', e);
      }
    }

    // Check if the result indicates an error
    if (result.error) {
      return NextResponse.json(
        { error: true, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in interpret-sentiment API:', error);
    return NextResponse.json(
      { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to interpret sentiment' 
      },
      { status: 500 }
    );
  }
}