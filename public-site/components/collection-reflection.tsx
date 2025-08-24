'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Heart } from 'lucide-react';
import Image from 'next/image';
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
}

export function CollectionReflection({ walletAddress, totalNfts }: CollectionReflectionProps) {
  const [sentiment, setSentiment] = useState('');
  const [count, setCount] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [interpretedNfts, setInterpretedNfts] = useState<InterpretedNFT[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
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

      setInterpretedNfts(data.selectedNfts || []);
      setInterpretation(data.interpretation || '');
      setThemes(data.themes || []);
    } catch (err) {
      console.error('Error interpreting sentiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to interpret your collection sentiment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSentiment('');
    setInterpretedNfts([]);
    setInterpretation('');
    setThemes([]);
    setError('');
  };

  if (totalNfts === 0) {
    return null; // Don't show this section if user has no NFTs
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Collection Reflection
        </CardTitle>
        <CardDescription>
          Share your feelings about your collection and discover which pieces resonate with your words
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        {interpretedNfts.length === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How does collecting on Shape make you feel? Please write a few words about what your collection means to you.
              </label>
              <Textarea
                placeholder="e.g., Collecting on Shape makes me feel connected to a creative community. Each piece represents a moment of discovery..."
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value)}
                className="min-h-[100px]"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Number of NFTs to show
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
                    Interpret Collection
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {/* Results */}
        {interpretedNfts.length > 0 && (
          <div className="space-y-4">
            {/* Interpretation */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm italic">{interpretation}</p>
              {themes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {themes.map((theme) => (
                    <span key={theme} className="text-xs px-2 py-1 bg-background rounded-full">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Selected NFTs Grid with Detailed Information */}
            <div className="grid gap-6">
              {interpretedNfts.map((nft, index) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}-${index}`} className="border rounded-lg p-4 space-y-4">
                  <div className="flex gap-4">
                    {/* NFT Image */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted relative group">
                        {nft.imageUrl ? (
                          <Image
                            src={nft.imageUrl}
                            alt={nft.name || 'NFT'}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="96px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Heart className="h-6 w-6" />
                          </div>
                        )}
                        
                        {/* Match Score Badge */}
                        <div className="absolute top-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                          {Math.round(nft.matchScore * 10)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* NFT Details */}
                    <div className="flex-1 min-w-0">
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium text-sm truncate">{nft.name || 'Unnamed NFT'}</h4>
                          <p className="text-xs text-muted-foreground">
                            Token #{nft.tokenId}
                          </p>
                        </div>
                        
                        {nft.description && (
                          <div className="text-xs text-muted-foreground">
                            <p className="line-clamp-2 leading-relaxed" title={nft.description}>
                              {nft.description}
                            </p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          <p className="truncate" title={nft.contractAddress}>
                            Collection: {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Match Analysis Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">MATCH ANALYSIS</span>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                        Score: {nft.matchScore.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="bg-muted/50 rounded p-3 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium">Overall Match:</span>
                        </p>
                        <p className="text-xs">{nft.reason}</p>
                      </div>
                      
                      {/* Detailed Match Breakdown */}
                      {nft.matchDetails && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {nft.matchDetails.textMatches.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                                📝 Text Matches:
                              </p>
                              <ul className="text-xs space-y-1">
                                {nft.matchDetails.textMatches.map((match, i) => (
                                  <li key={i} className="text-muted-foreground">• {match}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {nft.matchDetails.themeMatches.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                🎭 Theme Matches:
                              </p>
                              <ul className="text-xs space-y-1">
                                {nft.matchDetails.themeMatches.map((match, i) => (
                                  <li key={i} className="text-muted-foreground">• {match}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {nft.matchDetails.visualMatches.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                                🎨 Visual Matches:
                              </p>
                              <ul className="text-xs space-y-1">
                                {nft.matchDetails.visualMatches.map((match, i) => (
                                  <li key={i} className="text-muted-foreground">• {match}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-border/50">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Rank:</span> #{index + 1}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Collection unique:</span> ✓
                              </div>
                            </div>
                            {nft.matchDetails.collectionInfo && (
                              <div className="mt-1">
                                <span className="text-muted-foreground text-xs">
                                  Collection: {nft.matchDetails.collectionInfo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <Heart className="h-4 w-4" />
                Share Another Reflection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}