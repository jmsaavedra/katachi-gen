import { NextRequest, NextResponse } from 'next/server';

const KATACHI_GENERATOR_URL = process.env.KATACHI_GENERATOR_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.walletAddress || !body.images || !Array.isArray(body.images)) {
      return NextResponse.json(
        { error: true, message: 'Missing required fields: walletAddress and images array' },
        { status: 400 }
      );
    }

    console.log('Forwarding request to katachi-generator:', {
      url: KATACHI_GENERATOR_URL,
      walletAddress: body.walletAddress,
      imagesCount: body.images.length,
      forMinting: true
    });

    // Forward request to katachi-generator service with minting flag
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(KATACHI_GENERATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        forMinting: true // Force Arweave upload even in development
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Katachi generator error:', {
        status: response.status,
        statusText: response.statusText,
        url: KATACHI_GENERATOR_URL,
        body: errorText
      });
      throw new Error(`Katachi generator returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Katachi generator FULL response!:', JSON.stringify(data, null, 2));

    // Create complete token metadata for minting
    if (data.success && data.thumbnailId && data.htmlId) {
      const tokenMetadata = {
        name: `Katachi Gen`,
        description: `Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey and aesthetic preferences, creating a one-of-a-kind digital origami that captures the essence of your on-chain identity.\n\nhttps://katachi-gen.com`,
        image: `https://arweave.net/${data.thumbnailId}`,
        animation_url: data.htmlUrl || `https://arweave.net/${data.htmlId}`,
        external_url: data.htmlUrl || `https://arweave.net/${data.htmlId}`,
        attributes: [
          { trait_type: 'Sentiment', value: body.sentiment || 'Applied' },
          { trait_type: 'Stack Medals', value: body.stackMedals || 0 },
          { trait_type: 'Unique Collections', value: body.uniqueCollections || 0 },
          { trait_type: 'Pattern Type', value: data.patternType || 'Origami' },
          { trait_type: 'Total NFTs', value: body.totalNfts || 0 }
        ],
        properties: {
          category: 'art',
          creators: [{ address: body.walletAddress, share: 100 }]
        },
        arweave: {
          thumbnailId: data.thumbnailId,
          htmlId: data.htmlId,
          thumbnailUrl: data.thumbnailUrl,
          htmlUrl: data.htmlUrl
        }
      };

      
      // Return the complete token metadata instead of just the basic data
      return NextResponse.json({
        ...data,
        metadata: tokenMetadata
      });
    }

    // If we couldn't create metadata, return just the basic data
    return NextResponse.json(data);
  } catch (error) {
    // Type guards for error properties
    const errorName = error && typeof error === 'object' && 'name' in error ? (error as Error).name : undefined;
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
    
    console.error('Error in generate-katachi API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: KATACHI_GENERATOR_URL,
      isAborted: errorName === 'AbortError',
      isNetworkError: errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED'
    });
    
    let errorMessage = 'Failed to generate katachi pattern';
    if (errorName === 'AbortError') {
      errorMessage = 'Request timed out after 60 seconds';
    } else if (errorCode === 'ENOTFOUND') {
      errorMessage = 'Katachi generator service not found';
    } else if (errorCode === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to katachi generator service';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: true, 
        message: errorMessage,
        debug: {
          service_url: KATACHI_GENERATOR_URL,
          error_type: errorName,
          error_code: errorCode
        }
      },
      { status: 500 }
    );
  }
}