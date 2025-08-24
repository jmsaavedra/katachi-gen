'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Heart } from 'lucide-react';
import { Address } from 'viem';

interface InterpretedNFT {
  tokenId: string;
  contractAddress: Address;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  reason: string;
  matchScore: number;
  matchDetails?: {
    textMatches: string[];
    themeMatches: string[];
    visualMatches: string[];
    collectionInfo: string;
  };
}

interface CollectionReflectionProps {
  walletAddress: Address | undefined;
  totalNfts: number;
  onSentimentSubmitted?: (sentiment: string, filteredNfts: InterpretedNFT[]) => void;
  onCurationCompleted?: (interpretation: string, themes: string[], nfts: InterpretedNFT[]) => void;
}

export function CollectionReflection({ walletAddress, totalNfts, onSentimentSubmitted, onCurationCompleted }: CollectionReflectionProps) {
  const [sentiment, setSentiment] = useState('');
  const [count, setCount] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!walletAddress || !sentiment.trim()) {
      setError('Please connect your wallet and share your thoughts');
      return;
    }

    if (sentiment.trim().length < 10) {
      setError('Please write at least a few words about your collection');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call the MCP server endpoint
      const response = await fetch('/api/interpret-sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          sentiment: sentiment.trim(),
          count: parseInt(count),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to interpret sentiment: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || 'Failed to interpret collection');
      }

      
      // Notify parent that sentiment has been processed
      if (onSentimentSubmitted) {
        onSentimentSubmitted(sentiment.trim(), data.selectedNfts || []);
      }
      
      // Notify parent that curation is complete
      if (onCurationCompleted) {
        onCurationCompleted(data.interpretation || '', data.themes || [], data.selectedNfts || []);
      }
    } catch (err) {
      console.error('Error interpreting sentiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to interpret your collection sentiment');
    } finally {
      setIsLoading(false);
    }
  };


  if (totalNfts === 0) {
    return null; // Don't show this section if user has no NFTs
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Sentiment Filter
        </CardTitle>
        <CardDescription>
          Share your feelings about collecting on Shape and our AI will interpret your words to curate 5 pieces to be applied to your Katachi Gen Shape
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form - Always visible */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              What does collecting art mean to you? Write a few words about your favorite parts of collecting on Shape.
            </label>
            <Textarea
              placeholder='e.g., "I feel connected to a creative community." or "blue is my favorite color"'
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Number of NFTs to curate
              </label>
              <Select value={count} onValueChange={setCount} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 NFTs</SelectItem>
                  <SelectItem value="10">10 NFTs</SelectItem>
                  <SelectItem value="15">15 NFTs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !sentiment.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Interpreting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Curate Collection
                </>
              )}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

        </div>
      </CardContent>
    </Card>
  );
}