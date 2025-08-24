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
      walletAddress: body.walletAddress,
      imagesCount: body.images.length
    });

    // Forward request to katachi-generator service
    const response = await fetch(KATACHI_GENERATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Katachi generator error:', response.status, response.statusText);
      throw new Error(`Katachi generator returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Katachi generator response:', {
      success: data.success,
      thumbnailId: data.thumbnailId,
      htmlId: data.htmlId,
      hasThumbnail: !!data.thumbnailId
    });

    // Create complete token metadata for minting
    if (data.success && data.thumbnailId && data.htmlId) {
      const tokenMetadata = {
        name: `Katachi Gen #${data.thumbnailId?.slice(-8) || 'Unknown'}`,
        description: `Unique origami pattern generated from curated NFTs. This interactive 3D artwork represents your on-chain journey on Shape Network.`,
        image: data.thumbnailUrl || `https://arweave.net/${data.thumbnailId}`,
        animation_url: data.htmlUrl || `https://arweave.net/${data.htmlId}`,
        external_url: data.htmlUrl || `https://arweave.net/${data.htmlId}`,
        attributes: [
          { trait_type: 'Pattern Type', value: 'Origami' },
          { trait_type: 'Sentiment Filter', value: body.sentiment || 'Applied' },
          { trait_type: 'Wallet Address', value: body.walletAddress },
          { trait_type: 'Seed', value: body.seed2 || '0' }
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

      console.log('Token Ready for minting:', JSON.stringify(tokenMetadata, null, 2));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in generate-katachi API:', error);
    return NextResponse.json(
      { 
        error: true, 
        message: error instanceof Error ? error.message : 'Failed to generate katachi pattern' 
      },
      { status: 500 }
    );
  }
}