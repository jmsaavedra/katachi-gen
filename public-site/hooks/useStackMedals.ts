import { useState, useEffect, useRef } from 'react';
import { Address } from 'viem';

interface StackMedalsData {
  userAddress: string;
  timestamp: string;
  hasStack: boolean;
  totalMedals: number;
  medalsByTier: {
    bronze: number;
    silver: number;
    gold: number;
    special: number;
  };
  lastMedalClaimed: string | null;
}

// Cache to prevent duplicate requests
const cache = new Map<string, { data: StackMedalsData | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useStackMedals(userAddress: Address | undefined) {
  const [data, setData] = useState<StackMedalsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setData(null);
      setError(null);
      return;
    }

    // Check cache first
    const cached = cache.get(userAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setError(null);
      return;
    }

    const fetchStackMedals = async () => {
      // Abort previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/get-stack-medals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to fetch stack medals');
        }

        const result = await response.json();
        
        // Cache the result
        cache.set(userAddress, {
          data: result.data,
          timestamp: Date.now()
        });
        
        setData(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was aborted, don't update state
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stack medals';
        setError(errorMessage);
        setData(null);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchStackMedals();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userAddress]);

  return {
    data,
    isLoading,
    error,
  };
}