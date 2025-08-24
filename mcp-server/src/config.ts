import 'dotenv/config';
import { shape, shapeSepolia } from 'viem/chains';

export const config = {
  // Dual chain support
  readChainId: Number(process.env.READ_CHAIN_ID || process.env.CHAIN_ID || 360), // Default to mainnet for reading data
  mintChainId: Number(process.env.MINT_CHAIN_ID || 11011), // Default to testnet for minting
  
  // Legacy single chain ID (for backwards compatibility) - defaults to read chain
  chainId: Number(process.env.READ_CHAIN_ID || process.env.CHAIN_ID || 360),
  
  alchemyApiKey: process.env.ALCHEMY_API_KEY as string,
  raribleApiKey: process.env.RARIBLE_API_KEY as string,
  redisUrl: process.env.REDIS_URL as string,
  
  // Computed properties
  get isMainnetRead() { return this.readChainId === shape.id; },
  get isMainnetMint() { return this.mintChainId === shape.id; },
  
  get readRpcUrl() {
    return this.readChainId === shape.id
      ? 'https://mainnet.shape.network'
      : 'https://sepolia.shape.network';
  },
  
  get mintRpcUrl() {
    return this.mintChainId === shape.id
      ? 'https://mainnet.shape.network'
      : 'https://sepolia.shape.network';
  },
  
  // Legacy property (for backwards compatibility)
  get isMainnet() { return this.chainId === shape.id; },
  get defaultRpcUrl() {
    return this.chainId === shape.id
      ? 'https://mainnet.shape.network'
      : 'https://sepolia.shape.network';
  },
} as const;
