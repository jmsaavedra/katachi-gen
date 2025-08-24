import { useState, useEffect } from 'react';
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

export function useStackMedals(userAddress: Address | undefined) {
  const [data, setData] = useState<StackMedalsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setData(null);
      setError(null);
      return;
    }

    const fetchStackMedals = async () => {
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
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to fetch stack medals');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stack medals';
        setError(errorMessage);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStackMedals();
  }, [userAddress]);

  return {
    data,
    isLoading,
    error,
  };
}