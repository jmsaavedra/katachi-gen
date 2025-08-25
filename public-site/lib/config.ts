// Mint fee configuration
export const MINT_FEE = '0.005'; // 0.005 ETH
export const MINT_FEE_WEI = '5000000000000000'; // 0.005 ETH in wei

export const config = {
  // Separate chain IDs for reading vs minting
  readChainId: Number(process.env.NEXT_PUBLIC_READ_CHAIN_ID),
  mintChainId: Number(process.env.NEXT_PUBLIC_MINT_CHAIN_ID),
  
  // Safety settings
  allowMainnetMinting: process.env.NEXT_PUBLIC_ALLOW_MAINNET_MINTING === 'true',
  
  // Contract addresses
  katachiContractTestnet: process.env.NEXT_PUBLIC_KATACHI_CONTRACT_TESTNET as string,
  katachiContractMainnet: process.env.NEXT_PUBLIC_KATACHI_CONTRACT_MAINNET as string,
  
  // API keys
  alchemyKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY as string,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
  
  // MCP Server URL (server-side only, no NEXT_PUBLIC prefix needed)
  mcpServerUrl: process.env.MCP_SERVER_URL as string,
} as const;
