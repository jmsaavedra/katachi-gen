import { config } from './config';
import { shape, shapeSepolia } from 'viem/chains';
import { Chain } from 'viem';

// Get the chain object for reading NFT data (mainnet for real data)
export function getReadChain(): Chain {
  return config.readChainId === shape.id ? shape : shapeSepolia;
}

// Get the chain object for minting (testnet for safe testing)
export function getMintChain(): Chain {
  return config.mintChainId === shape.id ? shape : shapeSepolia;
}

// Get the appropriate Katachi contract address based on chain with safety checks
export function getKatachiContractAddress(chainId: number): string {
  if (chainId === shape.id) {
    // Safety check: prevent accidental mainnet minting
    if (!config.allowMainnetMinting) {
      throw new Error('Mainnet minting is disabled. Set NEXT_PUBLIC_ALLOW_MAINNET_MINTING=true to enable.');
    }
    return config.katachiContractMainnet || '';
  } else if (chainId === shapeSepolia.id) {
    return config.katachiContractTestnet || '';
  }
  return '';
}

// Get the contract address for the current mint chain with safety validation
export function getMintContractAddress(): string {
  // Additional safety check
  if (config.mintChainId === shape.id && !config.allowMainnetMinting) {
    console.warn('🚨 Mainnet minting is disabled for safety. Using testnet instead.');
    return config.katachiContractTestnet;
  }
  
  return getKatachiContractAddress(config.mintChainId);
}

// Chain configuration details
export const chainConfig = {
  read: {
    chainId: config.readChainId,
    chain: getReadChain(),
    name: config.readChainId === shape.id ? 'Shape Mainnet' : 'Shape Sepolia',
    explorer: config.readChainId === shape.id ? 'https://shapescan.xyz' : 'https://sepolia.shapescan.xyz',
  },
  mint: {
    chainId: config.mintChainId,
    chain: getMintChain(),
    name: config.mintChainId === shape.id ? 'Shape Mainnet' : 'Shape Sepolia', 
    explorer: config.mintChainId === shape.id ? 'https://shapescan.xyz' : 'https://sepolia.shapescan.xyz',
    contractAddress: getMintContractAddress(),
  }
} as const;