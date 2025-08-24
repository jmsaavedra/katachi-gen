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
} as const;
