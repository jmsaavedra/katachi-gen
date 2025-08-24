import { Alchemy, Network } from 'alchemy-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, shape, shapeSepolia } from 'viem/chains';
import { Redis } from 'ioredis';
import { config } from './config';

export const alchemy = new Alchemy({
  apiKey: config.alchemyApiKey,
  network: config.chainId === shape.id ? Network.SHAPE_MAINNET : Network.SHAPE_SEPOLIA,
});

export function rpcClient() {
  const chain = config.chainId === shape.id ? shape : shapeSepolia;
  const rootUrl = chain.id === shape.id ? 'shape-mainnet' : 'shape-sepolia';

  const rpcUrl = config.alchemyApiKey
    ? `https://${rootUrl}.g.alchemy.com/v2/${config.alchemyApiKey}`
    : config.defaultRpcUrl;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
    batch: {
      multicall: true,
    },
  });
}

export function mainnetRpcClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http(),
  });
}

// Redis client with proper error handling for Upstash
export const redis = config.redisUrl ? (() => {
  try {
    // Parse Redis URL to extract connection details
    const url = new URL(config.redisUrl);
    const isUpstash = url.hostname.includes('upstash.io');
    
    const redisConfig = {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableOfflineQueue: true, // Allow commands to queue when disconnected
      // For Upstash, we need TLS
      ...(isUpstash && { 
        tls: {
          // Accept self-signed certificates for Upstash
          rejectUnauthorized: false
        }
      }),
    };

    const client = new Redis(config.redisUrl, redisConfig);

    // Handle ALL Redis errors silently to prevent unhandled errors
    client.on('error', (err) => {
      // Silently log and continue - don't throw or crash
      console.warn('Redis error (caching disabled):', err.message);
    });

    client.on('connect', () => {
      console.log('Redis connected');
    });

    client.on('ready', () => {
      console.log('Redis ready');
    });

    client.on('close', () => {
      console.log('Redis connection closed');
    });

    client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    // Override the disconnect method to handle cleanup
    const originalDisconnect = client.disconnect.bind(client);
    client.disconnect = function(reconnect = false) {
      try {
        return originalDisconnect(reconnect);
      } catch (err) {
        console.warn('Redis disconnect error:', err);
        return Promise.resolve('OK');
      }
    };

    return client;
  } catch (error) {
    console.warn('Failed to create Redis client, caching disabled:', error);
    return null;
  }
})() : null;
