import { alchemy } from '@/lib/clients';
import { useQuery } from '@tanstack/react-query';
import { OwnedNftsResponse } from 'alchemy-sdk';
import { Address } from 'viem';

const PREDEFINED_WALLETS = [
  '0x9f6ae0370d74f0e591c64cec4a8ae0d627817014',
  '0xee49f82e58a1c2b306720d0c68047cbf70c11fb5',
  '0x136bbfe37988f82f8585ed155615b75371489d45',
  '0xd20ce27f650598c2d790714b4f6a7222b8ddce22'
];

/**
 * Hook to fetch all NFTs for a user (with automatic pagination to get complete collection)
 * Uses server-side caching via MCP server for pre-defined wallets to improve performance
 * @param address - User's address to fetch NFTs for
 * @returns react-query's response object containing OwnedNftsResponse data, pending states, errors, etc
 */
export function useNFTsForOwner(address: Address | undefined) {
  const isPredefinedWallet = address && PREDEFINED_WALLETS.includes(address.toLowerCase());

  return useQuery<OwnedNftsResponse>({
    queryKey: ['nfts', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');

      // Use API route for pre-defined wallets (server-side cached via MCP server)
      if (isPredefinedWallet) {
        const response = await fetch(`/api/get-prefetched-nfts?address=${address}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch NFTs');
        }

        const data = result.data;
        console.log(`Loaded ${data.ownedNfts.length} NFTs ${data.cached ? 'from cache' : 'from Alchemy'}`);

        return {
          ownedNfts: data.ownedNfts,
          totalCount: data.totalCount,
          pageKey: data.pageKey,
          validAt: data.validAt
        } as OwnedNftsResponse;
      }

      // Original client-side logic for user wallets
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
    staleTime: isPredefinedWallet ? 1000 * 60 * 60 * 2 : 1000 * 60 * 15, // 2 hours for predefined, 15 min for others
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable to avoid excessive refetching
    refetchOnReconnect: false, // Disable refetch on reconnect
  });
}

/**
 * Legacy hook name for backward compatibility
 */
export const useGetNftForUser = useNFTsForOwner;
