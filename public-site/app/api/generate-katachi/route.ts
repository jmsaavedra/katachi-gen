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
      txId: data.txId,
      hasThumbnail: !!data.thumbnail
    });

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