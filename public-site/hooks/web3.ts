import { alchemy } from '@/lib/clients';
import { useQuery } from '@tanstack/react-query';
import { OwnedNftsResponse } from 'alchemy-sdk';
import { Address } from 'viem';

/**
 * Hook to fetch all NFTs for a user (with automatic pagination to get complete collection)
 * @param address - User's address to fetch NFTs for
 * @returns react-query's response object containing OwnedNftsResponse data, pending states, errors, etc
 */
export function useNFTsForOwner(address: Address | undefined) {
  return useQuery<OwnedNftsResponse>({
    queryKey: ['nfts', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      
      // Fetch all NFTs by paginating through results
      let allNfts: any[] = [];
      let pageKey: string | undefined = undefined;
      let totalCount = 0;
      
      do {
        const response: OwnedNftsResponse = await alchemy.nft.getNftsForOwner(address, {
          pageKey,
          pageSize: 100, // Maximum page size
        });
        
        allNfts = allNfts.concat(response.ownedNfts);
        pageKey = response.pageKey;
        totalCount = response.totalCount;
        
        // Safety check to prevent infinite loops
        if (allNfts.length > 10000) {
          console.warn('Stopping NFT fetch at 10,000 NFTs to prevent excessive API calls');
          break;
        }
      } while (pageKey);
      
      return {
        ownedNfts: allNfts,
        totalCount: totalCount,
        pageKey: undefined,
        validAt: {
          blockNumber: 0,
          blockHash: '',
          blockTimestamp: ''
        }
      } as OwnedNftsResponse;
    },
    enabled: !!address,
    staleTime: 1000 * 60 * 10, // 10 minutes (longer since we're fetching more data)
    refetchInterval: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false, // Disable to avoid excessive refetching
  });
}

/**
 * Legacy hook name for backward compatibility
 */
export const useGetNftForUser = useNFTsForOwner;
