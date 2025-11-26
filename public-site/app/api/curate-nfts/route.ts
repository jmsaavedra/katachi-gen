import { NextRequest, NextResponse } from 'next/server';
import { withRelatedProject } from '@vercel/related-projects';

// Automatically resolves to the correct MCP server URL based on environment
const MCP_SERVER_URL = withRelatedProject({
  projectName: 'katachi-gen-mcp-server',
  defaultHost: process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp',
}) + '/mcp';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface MCPPayload {
  jsonrpc: string;
  method: string;
  params: {
    name: string;
    arguments: {
      address: string;
      themes: string[];
      sentiment: string;
      count: number;
    };
  };
  id: number;
}

// Helper function to make MCP request with retries
async function fetchMCPWithRetry(payload: MCPPayload, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Calling MCP server (curate-nfts)...`);

      const response = await fetch(MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000), // 60 second timeout (heavy operation)
      });

      if (response.ok) {
        console.log(`✅ MCP server responded successfully on attempt ${attempt}`);
        return response;
      }

      if (response.status >= 500 && attempt < retries) {
        console.warn(`⚠️ MCP server error (${response.status}), retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      return response;

    } catch (error: unknown) {
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
  const { address, themes, sentiment, count } = await request.json();

  try {
    if (!address || !themes || !sentiment || !count) {
      return NextResponse.json(
        { error: true, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const payload: MCPPayload = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'curateNftsByThemes',
        arguments: {
          address,
          themes,
          sentiment,
          count
        }
      },
      id: Date.now()
    };

    console.log('Calling MCP server (curate-nfts) with payload:', payload);

    // Retry logic with support for MCP response-level errors
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetchMCPWithRetry(payload);

        if (!response.ok) {
          console.error('MCP server error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('MCP server error details:', errorText);
          lastError = new Error(`MCP server returned ${response.status}: ${errorText}`);

          if (attempt < MAX_RETRIES) {
            console.warn(`⚠️ Retrying curation (attempt ${attempt + 1}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
          throw lastError;
        }

        const data = await response.json();

        if (data.error) {
          lastError = new Error(data.error.message || 'MCP server returned error');

          if (attempt < MAX_RETRIES) {
            console.warn(`⚠️ MCP returned error response. Retrying (attempt ${attempt + 1}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }

          return NextResponse.json(
            {
              error: true,
              message: 'Error in MCP curation tool. Please try again.',
              details: data.error.message
            },
            { status: 500 }
          );
        }

        // Extract the actual result from MCP response format
        let result = data.result;
        if (data.result && data.result.content && data.result.content[0] && data.result.content[0].text) {
          try {
            result = JSON.parse(data.result.content[0].text);

            // Create a sanitized version for logging (remove description and originalUrl from NFTs)
            const logResult = {
              ...result,
              selectedNfts: result.selectedNfts?.map((nft: any) => {
                const { description, ...nftWithoutDescription } = nft;
                // Also remove originalUrl from alchemyImages if it exists
                if (nftWithoutDescription.alchemyImages?.originalUrl) {
                  const { originalUrl, ...alchemyImagesWithoutUrl } = nftWithoutDescription.alchemyImages;
                  return { ...nftWithoutDescription, alchemyImages: alchemyImagesWithoutUrl };
                }
                return nftWithoutDescription;
              })
            };
            console.log('Parsed MCP result (curate-nfts):', JSON.stringify(logResult, null, 2));

            // Check if the parsed result also contains an error
            if (result.error) {
              lastError = new Error(result.message || 'Curation error');

              if (attempt < MAX_RETRIES) {
                console.warn(`⚠️ Parsed result contains error. Retrying (attempt ${attempt + 1}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
              }

              return NextResponse.json(
                {
                  error: true,
                  message: 'Error in MCP curation tool. Please try again.',
                  details: result.message
                },
                { status: 500 }
              );
            }
          } catch (e) {
            console.error('Could not parse MCP response as JSON:', e);
            lastError = new Error('Invalid JSON response from MCP server');

            if (attempt < MAX_RETRIES) {
              console.warn(`⚠️ JSON parse error. Retrying (attempt ${attempt + 1}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              continue;
            }
            throw lastError;
          }
        }

        // Success!
        console.log(`✅ Curation successful on attempt ${attempt}`);
        return NextResponse.json(result);

      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < MAX_RETRIES) {
          console.warn(`⚠️ Attempt ${attempt} failed: ${lastError.message}. Retrying (attempt ${attempt + 1}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        // Max retries exceeded
        throw lastError;
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error('Failed to curate NFTs');

  } catch (error: unknown) {
    console.error('Error in curate-nfts API after all retries:', error);

    return NextResponse.json(
      {
        error: true,
        message: 'Error in MCP curation tool. Please try again.',
        details: error instanceof Error ? error.message : 'Failed to curate NFTs',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
