import { alchemy } from '@/lib/clients';
import { useQuery } from '@tanstack/react-query';
import { OwnedNftsResponse } from 'alchemy-sdk';
import { Address } from 'viem';

/**
 * Hook to fetch all NFTs for a user
 * @param address - User's address to fetch NFTs for
 * @returns react-query's response object containing OwnedNftsResponse data, pending states, errors, etc
 */
export function useNFTsForOwner(address: Address | undefined) {
  return useQuery<OwnedNftsResponse>({
    queryKey: ['nfts', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const nfts = await alchemy.nft.getNftsForOwner(address);
      return nfts;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Legacy hook name for backward compatibility
 */
export const useGetNftForUser = useNFTsForOwner;
