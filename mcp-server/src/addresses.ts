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
    [shapeSepolia.id]: (process.env.KATACHI_CONTRACT_TESTNET || '0x4c0041C6A3B5bFf81415be201e779d96a146683f') as Address,
    [shape.id]: (process.env.KATACHI_CONTRACT_MAINNET || '0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57') as Address,
  },
};
