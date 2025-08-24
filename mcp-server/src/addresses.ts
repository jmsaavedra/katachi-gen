import { Address, zeroAddress } from 'viem';
import { shape, shapeSepolia } from 'viem/chains';

export const addresses: Record<string, Record<number, Address>> = {
  gasback: {
    [shape.id]: '0xf5e602c87d675E978F097503aedE4A766285a08B',
    [shapeSepolia.id]: '0xdF329d59bC797907703F7c198dDA2d770fC45034',
  },
  stack: {
    [shape.id]: '0x76d6aC90A62Ca547d51D7AcAeD014167F81B9931',
    [shapeSepolia.id]: '0xaF94F7b7Dd601967E3ebdba052F5Ed6d215220b3',
  },
  nftMinter: {
    [shapeSepolia.id]: (process.env.KATACHI_CONTRACT_TESTNET || '0x06740C004c98afA7f9F5C38C00B8DAF9c33ABFB3') as Address,
    [shape.id]: (process.env.KATACHI_CONTRACT_MAINNET || '0x3293D7cb0E2548fC51ed884a3088fBD0B6F4b8e1') as Address,
  },
};
