import { config } from '@/lib/config';
import '@rainbow-me/rainbowkit/styles.css';
import { Alchemy, Network } from 'alchemy-sdk';
import { createPublicClient, http } from 'viem';
import { shape, shapeSepolia } from 'viem/chains';

// Use read chain for Alchemy client (for fetching NFT data)
export const alchemy = new Alchemy({
  apiKey: config.alchemyKey,
  network: config.readChainId === shape.id ? Network.SHAPE_MAINNET : Network.SHAPE_SEPOLIA,
});

// RPC client for reading blockchain data
export function rpcClient() {
  const chainId = config.readChainId;
  const chain = chainId === shape.id ? shape : shapeSepolia;
  const rootUrl = chainId === shape.id ? 'shape-mainnet' : 'shape-sepolia';

  return createPublicClient({
    chain,
    transport: http(`https://${rootUrl}.g.alchemy.com/v2/${config.alchemyKey}`),
    batch: {
      multicall: true,
    },
  });
}
