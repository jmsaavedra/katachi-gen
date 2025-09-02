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
  onSentimentSubmitted?: (sentiment: string, filteredNfts: InterpretedNFT[]) => void;
  onCurationCompleted?: (interpretation: string, themes: string[], nfts: InterpretedNFT[], sentiment?: string) => void;
  curatedNfts?: InterpretedNFT[];
  curationInterpretation?: string;
  curationThemes?: string[];
}

export function CollectionReflection({ walletAddress, totalNfts, onSentimentSubmitted, onCurationCompleted, curatedNfts = [], curationInterpretation = '', curationThemes = [] }: CollectionReflectionProps) {
  // Random 5-word sentences for development testing
  const devSentences = [
    'I love creative community vibes',
    'Blue colors make me happy',
    'Art connects souls through beauty',
    'Digital collectibles inspire my creativity',
    'Shape network feels like home'
  ];
  
  const getRandomDevSentiment = () => {
    if (process.env.NODE_ENV === 'development') {
      return devSentences[Math.floor(Math.random() * devSentences.length)];
    }
    return '';
  };
  
  const [sentiment, setSentiment] = useState(getRandomDevSentiment());
  const [count, setCount] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCurated, setIsCurated] = useState(false);

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
        onCurationCompleted(data.interpretation || '', data.themes || [], data.selectedNfts || [], sentiment.trim());
      }
      
      // Mark as curated to stop animation
      setIsCurated(true);
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
    <Card className={!isCurated ? "pulse-blue-border" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
          <Heart className="h-6 w-6 md:h-7 md:w-7 text-red-500 animate-pulse" />
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Step 1: Sentiment Filter
          </span>
        </CardTitle>
        <CardDescription className="text-base">
          Share your feelings about collecting on Shape. Our AI will interpret your words and curate 5 pieces for your Katachi Gen Shape.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form - Always visible */}
        <div className="space-y-6">
          <div className="space-y-4 pt-4">
            <label className="text-lg md:text-2xl font-bold block text-center">
              <span className="inline md:hidden">
                What does collecting art mean to you? What&apos;s your favorite thing about collecting on Shape?
              </span>
              <span className="hidden md:inline">
                What does collecting art mean to you?<br />
                What&apos;s your favorite thing about collecting on Shape?
              </span>
            </label>
            <div className="flex justify-center">
              <Textarea
                placeholder='e.g., "I love feeling connected to such a creative community." or "i like turtles."'
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && sentiment.trim() && !isLoading && !isCurated) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className={`min-h-[120px] w-full md:w-4/5 text-center ${isCurated ? 'opacity-75 cursor-not-allowed' : ''}`}
                style={{ 
                  fontSize: '1.125rem', 
                  lineHeight: '1.5',
                  minHeight: '120px',
                  resize: 'vertical',
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
                disabled={isLoading || isCurated}
              />
            </div>
          </div>

          <div className="flex justify-center pb-2">
            <div className="flex-1" style={{ display: 'none' }}>
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

            {!isCurated && (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !sentiment.trim() || isCurated}
                className={`gap-3 text-lg px-8 py-6 ${!isLoading && sentiment.trim() && !error && !isCurated ? 'animate-gradient-button' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Interpreting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Curate Collection
                  </>
                )}
              </Button>
            )}
          </div>

          {error && (
            <p className="text-base text-destructive text-center">{error}</p>
          )}

          {/* Curated Collection Results */}
          {isCurated && curatedNfts && curatedNfts.length > 0 && (
            <div className="space-y-6 pt-6 border-t -mx-6 px-6 md:mx-0 md:px-0">
              {/* Interpretation */}
              {curationInterpretation && (
                <div>
                  <p className="text-base text-muted-foreground">{curationInterpretation}</p>
                </div>
              )}
              
              {/* Themes */}
              {curationThemes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {curationThemes.map((theme) => (
                    <span key={theme} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Curated NFTs in Individual Rows */}
              <div className="space-y-4 -mx-6 md:mx-0">
                {curatedNfts.map((nft, index) => (
                  <div key={`${nft.contractAddress}-${nft.tokenId}-${index}`} className="border border-x-0 md:border-x rounded-none md:rounded-lg p-4">
                    <div className="flex gap-4">
                      {/* NFT Image */}
                      <div className="flex-shrink-0">
                        <a 
                          href={`https://opensea.io/assets/shape/${nft.contractAddress}/${nft.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted relative group cursor-pointer">
                            {nft.imageUrl ? (
                              <Image
                                src={nft.imageUrl}
                                alt={nft.name || 'NFT'}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="128px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Heart className="h-8 w-8" />
                              </div>
                            )}
                            
                            {/* Match Score Badge */}
                            <div className="absolute top-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                              {Math.round(nft.matchScore * 10)}%
                            </div>
                          </div>
                        </a>
                        {/* Mobile only: Title under image */}
                        <div className="mt-2 w-32 md:hidden">
                          <h4 className="font-medium text-sm leading-tight">{nft.name || 'Unnamed NFT'}</h4>
                          <p className="text-xs text-muted-foreground">
                            Token #{nft.tokenId} • Rank #{index + 1}
                          </p>
                        </div>
                      </div>
                      
                      {/* NFT Details */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            {/* Desktop: Title in header */}
                            <div className="hidden md:block">
                              <h4 className="font-medium text-sm">{nft.name || 'Unnamed NFT'}</h4>
                              <p className="text-xs text-muted-foreground">
                                Token #{nft.tokenId} • Rank #{index + 1}
                              </p>
                            </div>
                            {/* Mobile: Just score chip */}
                            <div className="md:hidden">
                              <div className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                                Score: {nft.matchScore.toFixed(2)}
                              </div>
                            </div>
                            {/* Desktop: Score chip */}
                            <span className="hidden md:inline text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                              Score: {nft.matchScore.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            <p className="truncate" title={nft.contractAddress}>
                              Collection: {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                            </p>
                          </div>
                          
                          <div className="bg-muted/50 rounded p-2">
                            <p className="text-xs">{nft.reason}</p>
                          </div>
                          {/* Match Details */}
                          {nft.matchDetails && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-border/50">
                              {nft.matchDetails.textMatches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                                    📝 Text: {nft.matchDetails.textMatches.length}
                                  </p>
                                </div>
                              )}
                              
                              {nft.matchDetails.themeMatches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    🎭 Themes: {nft.matchDetails.themeMatches.length}
                                  </p>
                                </div>
                              )}
                              
                              {nft.matchDetails.visualMatches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                                    🎨 Visual: {nft.matchDetails.visualMatches.length}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}