// Cache client, feel free to replace with your provider of choice. If no Redis configured, the cache will be disabled you don't have to worry about it.

import { redis } from '../clients';

/**
 * Cache TTL in seconds
 */
export const CACHE_TTL = 60 * 1;

/**
 * Get cached value from Redis
 * @param key - The key to get
 * @returns The cached value or null if no Redis configured or on error
 */
export async function getCached(key: string): Promise<string | null> {
  if (!redis) return null; // Skip if no Redis configured
  
  try {
    // Set a timeout for the Redis operation
    const result = await Promise.race([
      redis.get(key),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      )
    ]);
    return result;
  } catch (err) {
    // Always return null on any error to ensure caching failures don't break the app
    console.warn('Redis get failed, continuing without cache:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Set cached value in Redis
 * @param key - The key to set
 * @param value - The value to set
 * @param ttl - The time to live in seconds (default: 60)
 */
export async function setCached(
  key: string,
  value: string,
  ttl: number = CACHE_TTL
): Promise<void> {
  if (!redis) return; // Skip caching if no Redis configured
  
  try {
    // Set a timeout for the Redis operation
    await Promise.race([
      redis.setex(key, ttl, value),
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      )
    ]);
  } catch (err) {
    // Silently fail on cache write errors - don't disrupt the application
    console.warn('Redis set failed, continuing without caching:', err instanceof Error ? err.message : err);
  }
}
