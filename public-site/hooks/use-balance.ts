'use client';

import { config } from '@/lib/config';
import { useAccount, useBalance } from 'wagmi';

export function useWalletBalance() {
  const { address, isConnected } = useAccount();

  const {
    data: balance,
    isLoading,
    error,
  } = useBalance({
    address,
    chainId: config.mintChainId, // Use mint chain for balance (where users need funds to mint)
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    balance,
    isLoading,
    error,
    isConnected,
    address,
  };
}
