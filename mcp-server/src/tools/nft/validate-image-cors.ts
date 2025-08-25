import { z } from 'zod';
import { type InferSchema } from 'xmcp';

export const schema = {
  imageUrl: z.string().url().describe('Image URL to test for CORS compatibility'),
  timeout: z.number().optional().default(5000).describe('Timeout in milliseconds (default: 5000)')
};

export const metadata = {
  name: 'validateImageCors',
  description: 'Test if an image URL supports CORS for cross-origin access',
  annotations: {
    title: 'Validate Image CORS',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    requiresWallet: false,
    category: 'nft-validation',
    cacheTTL: 60 * 30, // 30 minutes cache
  },
};

/**
 * Validates if an image URL supports CORS by attempting to load it
 */
export async function validateImageCors(imageUrl: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(imageUrl, {
      method: 'HEAD', // Use HEAD to minimize data transfer
      mode: 'cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    // Check if the response is successful and CORS headers are present
    const corsHeader = response.headers.get('access-control-allow-origin');
    return response.ok && (corsHeader === '*' || corsHeader !== null);
    
  } catch (error) {
    // CORS errors, network errors, or timeouts will throw
    return false;
  }
}

export default async function validateImageCorsEndpoint({ imageUrl, timeout }: InferSchema<typeof schema>) {
  const startTime = Date.now();
  
  try {
    const isValid = await validateImageCors(imageUrl, timeout);
    const processingTime = Date.now() - startTime;
    
    const result = {
      imageUrl,
      corsValid: isValid,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      status: isValid ? 'valid' : 'blocked',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            imageUrl,
            message: `CORS validation failed: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }
}