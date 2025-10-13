import { NextRequest, NextResponse } from 'next/server';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://katachi-gen-mcp-server.vercel.app/mcp';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000; // 2 seconds

// Helper function to make MCP request with retries for cold starts
async function fetchMCPWithRetry(payload: any, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Calling MCP server...`);

      const response = await fetch(MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout (Vercel Pro has longer limits)
      });

      // If successful, return immediately
      if (response.ok) {
        console.log(`✅ MCP server responded successfully on attempt ${attempt}`);
        return response;
      }

      // If it's a server error and we have retries left, try again
      if (response.status >= 500 && attempt < retries) {
        console.warn(`⚠️ MCP server error (${response.status}), retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      // Otherwise return the response (will be handled by error logic)
      return response;

    } catch (error) {
      // Handle timeout or network errors
      if (attempt < retries) {
        console.warn(`⚠️ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const { address, sentiment, count } = await request.json();

    if (!address || !sentiment || !count) {
      return NextResponse.json(
        { error: true, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Make request to MCP server with retry logic
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

    const response = await fetchMCPWithRetry(payload);

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
      seed2: Math.floor(Math.random() * 1000000) + '_' + Date.now(),
      patternType: '',
      totalNfts: count,
      uniqueCollections: 2,
      message: 'MCP server unavailable - using fallback pattern'
    };
    
    console.log('Using fallback response:', fallbackResponse);
    return NextResponse.json(fallbackResponse);
  }
}