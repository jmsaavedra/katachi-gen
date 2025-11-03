// Redis client utility for queue system
// Reuses the same connection pattern as mcp-server for consistency
const Redis = require('ioredis');

/**
 * Create Redis client for Bull queue
 * Returns null if REDIS_URL not configured (graceful degradation)
 */
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL not set - queue system disabled');
    console.warn('⚠️  Falling back to direct processing mode');
    return null;
  }

  try {
    console.log('🔗 Initializing Redis for queue system...');
    const url = new URL(redisUrl);
    const isUpstash = url.hostname.includes('upstash.io');

    const config = {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      enableOfflineQueue: true,
      retryDelayOnFailover: 100,
      lazyConnect: true, // Don't connect until first use
      // Upstash requires TLS
      ...(isUpstash && {
        tls: {
          rejectUnauthorized: false
        }
      }),
    };

    const client = new Redis(redisUrl, config);

    // Error handling
    client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      // Don't crash - let the system continue without queue
    });

    client.on('connect', () => {
      console.log('✅ Redis connected for queue system');
    });

    client.on('ready', () => {
      console.log('✅ Redis ready');
    });

    client.on('close', () => {
      console.log('⚠️  Redis connection closed');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Override disconnect to handle cleanup gracefully
    const originalDisconnect = client.disconnect.bind(client);
    client.disconnect = function(reconnect = false) {
      try {
        return originalDisconnect(reconnect);
      } catch (err) {
        console.warn('⚠️  Redis disconnect error:', err.message);
        return Promise.resolve('OK');
      }
    };

    return client;
  } catch (error) {
    console.error('❌ Failed to create Redis client:', error.message);
    console.warn('⚠️  Queue system disabled - falling back to direct processing');
    return null;
  }
}

module.exports = { createRedisClient };
