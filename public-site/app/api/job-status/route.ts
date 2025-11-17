import { NextRequest, NextResponse } from 'next/server';

const KATACHI_GENERATOR_URL = process.env.NEXT_PUBLIC_GENERATOR_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get jobId from query params
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: true, message: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    console.log(`Polling job status: ${jobId}`);

    // Fetch job status from katachi-generator
    const response = await fetch(`${KATACHI_GENERATOR_URL}/job/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Job status error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        jobId
      });

      // Handle 404 (job not found) specifically
      if (response.status === 404) {
        return NextResponse.json(
          { error: true, message: 'Job not found', jobId },
          { status: 404 }
        );
      }

      throw new Error(`Status check returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Job ${jobId} status:`, data.status, `(${data.progress}%)`);

    // If job is completed, add metadata for minting
    if (data.status === 'completed' && data.result) {
      const result = data.result;

      // Create complete token metadata
      if (result.success && result.thumbnailId && result.htmlId) {
        const tokenMetadata = {
          name: `Katachi Gen`,
          description: `Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey and aesthetic preferences, creating a one-of-a-kind digital origami that captures the essence of your on-chain identity.\n\nhttps://katachi-gen.com`,
          image: `https://arweave.net/${result.thumbnailId}`,
          animation_url: result.htmlUrl || `https://arweave.net/${result.htmlId}`,
          external_url: result.htmlUrl || `https://arweave.net/${result.htmlId}`,
          attributes: [
            { trait_type: 'Sentiment', value: data.data?.sentiment || 'Applied' },
            { trait_type: 'Stack Medals', value: data.data?.stackMedals || 0 },
            { trait_type: 'Unique Collections', value: data.data?.uniqueCollections || 0 },
            { trait_type: 'Pattern Type', value: result.patternType || 'Origami' },
            { trait_type: 'Total NFTs', value: data.data?.totalNfts || 0 }
          ],
          properties: {
            category: 'art',
            creators: [{ address: data.data?.walletAddress, share: 100 }]
          },
          arweave: {
            thumbnailId: result.thumbnailId,
            htmlId: result.htmlId,
            thumbnailUrl: result.thumbnailUrl,
            htmlUrl: result.htmlUrl
          }
        };

        // Return job status with metadata
        return NextResponse.json({
          jobId: data.jobId,
          status: data.status,
          progress: data.progress,
          result: {
            ...result,
            metadata: tokenMetadata
          }
        });
      }
    }

    // Return raw job status
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error checking job status:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : 'Failed to check job status',
      },
      { status: 500 }
    );
  }
}
