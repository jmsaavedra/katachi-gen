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
      const errorText = await response.text();
      console.error('MCP server error details:', errorText);
      throw new Error(`MCP server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

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
        console.log('Parsed MCP result:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.error('Could not parse MCP response as JSON:', e);
        console.error('Raw text was:', data.result.content[0].text);
        throw new Error('Invalid JSON response from MCP server');
      }
    } else {
      console.error('Unexpected MCP response format:', JSON.stringify(data, null, 2));
      throw new Error('Invalid MCP response format');
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
    console.log('Falling back to basic interpretation due to MCP server error');
    
    // Fallback: return a basic response when MCP server is down
    const { address, sentiment, count } = await request.json();
    const fallbackResponse = {
      error: false,
      images: [
        { url: 'https://exonemo.com/test/katachi-gen/images/flower.webp' },
        { url: 'https://exonemo.com/test/katachi-gen/images/karborn.webp' }
      ],
      walletAddress: address,
      sentiment: sentiment,
      seed2: Math.floor(Math.random() * 1000),
      patternType: '',
      totalNfts: count,
      uniqueCollections: 2,
      message: 'MCP server unavailable - using fallback pattern'
    };
    
    console.log('Using fallback response:', fallbackResponse);
    return NextResponse.json(fallbackResponse);
  }
}