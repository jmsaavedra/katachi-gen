import { NextRequest, NextResponse } from 'next/server';

const KATACHI_GENERATOR_URL = process.env.NEXT_PUBLIC_GENERATOR_URL || 'http://localhost:3001';

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
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 second (3 minute) timeout
    
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
    console.log('Katachi generator response:', JSON.stringify(data, null, 2));

    // Check if this is a queue response (jobId present) or direct response
    if (data.jobId && data.status === 'queued') {
      console.log('✅ Job queued successfully:', data.jobId);
      // Return job info for polling
      return NextResponse.json({
        success: true,
        jobId: data.jobId,
        status: data.status,
        statusUrl: data.statusUrl,
        message: data.message || 'Generation queued'
      });
    }

    // Backend only returns visual assets (Arweave IDs, URLs, pattern data)
    // Frontend is responsible for generating all metadata attributes using buildNftAttributes()
    if (data.success && data.thumbnailId && data.htmlId) {
      console.log('✅ Pattern generation complete - visual assets ready:', {
        thumbnailId: data.thumbnailId,
        htmlId: data.htmlId,
        thumbnailUrl: data.thumbnailUrl,
        htmlUrl: data.htmlUrl
      });
    }

    // Return only the visual asset data (no metadata attributes)
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
      errorMessage = 'Request timed out after 3 minutes';
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