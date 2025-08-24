# Client-Side Pagination Implementation Guide

## Overview
This guide shows how to implement pagination in your client app when using the updated `getShapeNft` MCP tool.

## 1. Basic Pagination Flow

```typescript
interface NFTPaginationState {
  currentPage: number;
  pageSize: number;
  nextPageKey?: string;
  hasNextPage: boolean;
  totalNfts: number;
  isLoading: boolean;
}

// Initialize pagination state
const [paginationState, setPaginationState] = useState<NFTPaginationState>({
  currentPage: 1,
  pageSize: 50, // or whatever you prefer
  hasNextPage: false,
  totalNfts: 0,
  isLoading: false
});

const [nfts, setNfts] = useState<NFT[]>([]);
```

## 2. First Page Request

```typescript
const fetchFirstPage = async (walletAddress: string, pageSize = 50) => {
  setPaginationState(prev => ({ ...prev, isLoading: true }));
  
  try {
    const response = await mcpClient.callTool('getShapeNft', {
      address: walletAddress,
      pageSize: pageSize
    });
    
    const data = JSON.parse(response.content[0].text);
    
    // Update NFTs (replace existing)
    setNfts(data.nfts);
    
    // Update pagination state
    setPaginationState({
      currentPage: 1,
      pageSize: data.pagination.pageSize,
      nextPageKey: data.pagination.nextPageKey,
      hasNextPage: data.pagination.hasNextPage,
      totalNfts: data.totalNfts,
      isLoading: false
    });
    
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    setPaginationState(prev => ({ ...prev, isLoading: false }));
  }
};
```

## 3. Next Page Request

```typescript
const fetchNextPage = async (walletAddress: string) => {
  if (!paginationState.hasNextPage || !paginationState.nextPageKey) {
    return;
  }
  
  setPaginationState(prev => ({ ...prev, isLoading: true }));
  
  try {
    const response = await mcpClient.callTool('getShapeNft', {
      address: walletAddress,
      pageKey: paginationState.nextPageKey,
      pageSize: paginationState.pageSize
    });
    
    const data = JSON.parse(response.content[0].text);
    
    // Append new NFTs to existing ones
    setNfts(prev => [...prev, ...data.nfts]);
    
    // Update pagination state
    setPaginationState(prev => ({
      ...prev,
      currentPage: prev.currentPage + 1,
      nextPageKey: data.pagination.nextPageKey,
      hasNextPage: data.pagination.hasNextPage,
      isLoading: false
    }));
    
  } catch (error) {
    console.error('Error fetching next page:', error);
    setPaginationState(prev => ({ ...prev, isLoading: false }));
  }
};
```

## 4. Complete React Hook Example

```typescript
const useNFTPagination = (walletAddress: string, initialPageSize = 50) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [paginationState, setPaginationState] = useState<NFTPaginationState>({
    currentPage: 1,
    pageSize: initialPageSize,
    hasNextPage: false,
    totalNfts: 0,
    isLoading: false
  });

  const reset = () => {
    setNfts([]);
    setPaginationState(prev => ({
      ...prev,
      currentPage: 1,
      nextPageKey: undefined,
      hasNextPage: false,
      totalNfts: 0
    }));
  };

  const fetchPage = async (pageKey?: string, replace = false) => {
    setPaginationState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const params = {
        address: walletAddress,
        pageSize: paginationState.pageSize,
        ...(pageKey && { pageKey })
      };
      
      const response = await mcpClient.callTool('getShapeNft', params);
      const data = JSON.parse(response.content[0].text);
      
      if (replace) {
        setNfts(data.nfts);
      } else {
        setNfts(prev => [...prev, ...data.nfts]);
      }
      
      setPaginationState(prev => ({
        ...prev,
        currentPage: replace ? 1 : prev.currentPage + 1,
        nextPageKey: data.pagination.nextPageKey,
        hasNextPage: data.pagination.hasNextPage,
        totalNfts: data.totalNfts,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      setPaginationState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const fetchFirstPage = () => fetchPage(undefined, true);
  const fetchNextPage = () => fetchPage(paginationState.nextPageKey, false);

  return {
    nfts,
    paginationState,
    fetchFirstPage,
    fetchNextPage,
    reset
  };
};
```

## 5. UI Component Example

```tsx
const NFTList = ({ walletAddress }: { walletAddress: string }) => {
  const {
    nfts,
    paginationState,
    fetchFirstPage,
    fetchNextPage,
    reset
  } = useNFTPagination(walletAddress);

  useEffect(() => {
    if (walletAddress) {
      reset();
      fetchFirstPage();
    }
  }, [walletAddress]);

  return (
    <div>
      <div className="nft-stats">
        <p>Total NFTs: {paginationState.totalNfts}</p>
        <p>Showing: {nfts.length} NFTs</p>
        <p>Page Size: {paginationState.pageSize}</p>
      </div>

      <div className="nft-grid">
        {nfts.map((nft, index) => (
          <div key={`${nft.contractAddress}-${nft.tokenId}`} className="nft-card">
            {nft.imageUrl && <img src={nft.imageUrl} alt={nft.name || 'NFT'} />}
            <h3>{nft.name || `Token #${nft.tokenId}`}</h3>
            <p>{nft.contractAddress}</p>
          </div>
        ))}
      </div>

      {paginationState.hasNextPage && (
        <button 
          onClick={fetchNextPage}
          disabled={paginationState.isLoading}
          className="load-more-btn"
        >
          {paginationState.isLoading ? 'Loading...' : 'Load More NFTs'}
        </button>
      )}

      {paginationState.isLoading && (
        <div className="loading-indicator">
          Loading NFTs...
        </div>
      )}
    </div>
  );
};
```

## 6. Infinite Scroll Implementation

```typescript
const useInfiniteScroll = (
  fetchNextPage: () => void,
  hasNextPage: boolean,
  isLoading: boolean
) => {
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 && // 1000px before bottom
        hasNextPage &&
        !isLoading
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isLoading]);
};

// Use in component:
const NFTListWithInfiniteScroll = ({ walletAddress }) => {
  const pagination = useNFTPagination(walletAddress);
  
  useInfiniteScroll(
    pagination.fetchNextPage,
    pagination.paginationState.hasNextPage,
    pagination.paginationState.isLoading
  );

  return <NFTList {...pagination} />;
};
```

## 7. Page Size Selector

```tsx
const PageSizeSelector = ({ 
  currentSize, 
  onSizeChange 
}: { 
  currentSize: number; 
  onSizeChange: (size: number) => void; 
}) => (
  <select 
    value={currentSize} 
    onChange={(e) => onSizeChange(Number(e.target.value))}
  >
    <option value={25}>25 per page</option>
    <option value={50}>50 per page</option>
    <option value={100}>100 per page</option>
  </select>
);
```

## 8. Error Handling & Loading States

```typescript
const [error, setError] = useState<string | null>(null);

const fetchWithErrorHandling = async (fetchFn: () => Promise<void>) => {
  try {
    setError(null);
    await fetchFn();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error occurred');
  }
};
```

## 9. Collection Filtering (Optional)

```typescript
const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

const filteredNFTs = useMemo(() => {
  if (!selectedCollection) return nfts;
  return nfts.filter(nft => nft.contractAddress === selectedCollection);
}, [nfts, selectedCollection]);

// Extract unique collections from current page
const collections = useMemo(() => {
  const uniqueCollections = new Map();
  nfts.forEach(nft => {
    uniqueCollections.set(nft.contractAddress, nft.contractAddress);
  });
  return Array.from(uniqueCollections.values());
}, [nfts]);
```

## 10. Key Implementation Tips

1. **Cache Management**: The MCP tool handles caching, but you might want client-side caching too
2. **Unique Keys**: Use `${contractAddress}-${tokenId}` for React keys
3. **Performance**: Consider virtualizing large lists with libraries like `react-window`
4. **UX**: Show loading states and total counts to users
5. **Error Boundaries**: Wrap NFT components in error boundaries
6. **Accessibility**: Add proper ARIA labels and keyboard navigation

## Usage Examples

```typescript
// Get first 100 NFTs (default)
getShapeNft({ address: "0x..." })

// Get first 25 NFTs
getShapeNft({ address: "0x...", pageSize: 25 })

// Get next page using pageKey from previous response
getShapeNft({ address: "0x...", pageKey: "xyz123", pageSize: 25 })
```

## AI Assistant Prompts

Users can now ask questions like:
- "Show me the first 50 NFTs for wallet 0x..."
- "Get the next page of NFTs using pageKey xyz..."
- "What NFTs does this wallet hold? Show me 25 at a time"
