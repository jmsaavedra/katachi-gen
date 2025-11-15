'use client';

import { useState, useRef, useEffect } from 'react';
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
  collectionName: string | null;
  alchemyImages?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
    contentType?: string;
    size?: number;
  };
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
  onShowStep2?: () => void;
  curatedNfts?: InterpretedNFT[];
  curationInterpretation?: string;
  curationThemes?: string[];
}

export function CollectionReflection({ walletAddress, totalNfts, onSentimentSubmitted, onCurationCompleted, onShowStep2, curatedNfts = [], curationInterpretation = '', curationThemes = [] }: CollectionReflectionProps) {
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
  const [count, setCount] = useState('8');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCurated, setIsCurated] = useState(false);
  const [hoveredNft, setHoveredNft] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [fadeOutSubtitle, setFadeOutSubtitle] = useState(false);
  const [hideForm, setHideForm] = useState(false);
  const [formHeight, setFormHeight] = useState<number | null>(null);
  const [expandPanel, setExpandPanel] = useState(false);
  const hasStartedTyping = useRef(false);
  const currentIndexRef = useRef(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Typewriter effect
  useEffect(() => {
    if (!showInterpretation || !curationInterpretation || hasStartedTyping.current) {
      return;
    }

    console.log('Starting typewriter effect for:', curationInterpretation);
    hasStartedTyping.current = true;
    setIsTyping(true);
    setDisplayedText('');
    currentIndexRef.current = 0;

    // Store the text in a ref to avoid closure issues
    const textToType = curationInterpretation;
    
    const typeNextCharacter = () => {
      if (currentIndexRef.current < textToType.length) {
        currentIndexRef.current++;
        setDisplayedText(textToType.slice(0, currentIndexRef.current));
        console.log('Typing progress:', currentIndexRef.current, '/', textToType.length);
        
        // Random delay between 30-80ms to simulate thinking (faster)
        const randomDelay = 30 + Math.random() * 50;
        setTimeout(typeNextCharacter, randomDelay);
      } else {
        console.log('Typewriter effect completed');
        setIsTyping(false);
        // Expand panel and show grid after typing completes (0.5s buffer)
        setTimeout(() => {
          setExpandPanel(true);
          setShowGrid(true);
        }, 500);
        // Show Step 2 after grid is displayed (additional 0.5s pause)
        setTimeout(() => {
          // Notify parent to show Step 2 panel
          if (onShowStep2) {
            onShowStep2();
          }
        }, 1000);
      }
    };
    
    // Start typing
    typeNextCharacter();
    
    return () => {
      console.log('Cleaning up typewriter effect');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInterpretation]);

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
      
      // Reset typing state for new interpretation
      hasStartedTyping.current = false;
      
      // Capture current form height before fade out
      if (formRef.current) {
        setFormHeight(formRef.current.offsetHeight);
      }
      
      // Start fade out animation for subtitle and form
      setFadeOutSubtitle(true);
      
      // After 2s fade out, hide form completely and show interpretation
      setTimeout(() => {
        setShowSubtitle(false);
        setHideForm(true); // Completely hide form after fade out
        setShowInterpretation(true);
      }, 2000);
      
      // Grid and Step 2 will be shown by the typewriter effect
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
        {showSubtitle && (
          <CardDescription 
            className="text-base transition-opacity duration-[2000ms]"
            style={{ opacity: fadeOutSubtitle ? 0 : 1 }}
          >
            Share your feelings about collecting on Shape. Feel free to write as little or as much as you&apos;d like! <br /> Our AI will interpret your response and curate up to 8 pieces from your collection based on sentiment heuristics.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent 
        className="space-y-6 transition-all duration-500"
        style={{
          minHeight: formHeight && !expandPanel ? `${formHeight}px` : 'auto'
        }}
      >
        {/* Input Form - Show when not curated OR during fade out, but hide after fade completes */}
        {!hideForm && (!isCurated || fadeOutSubtitle) && (
          <div 
            ref={formRef}
            className="space-y-6 transition-opacity duration-[2000ms]"
            style={{ 
              opacity: fadeOutSubtitle ? 0 : 1
            }}
          >
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
                    if (e.key === 'Enter' && !e.shiftKey && sentiment.trim() && !isLoading) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="min-h-[120px] w-full md:w-4/5 text-center"
                  style={{ 
                    fontSize: '1.125rem', 
                    lineHeight: '1.5',
                    minHeight: '120px',
                    resize: 'vertical',
                    paddingTop: '1rem',
                    paddingBottom: '1rem'
                  }}
                  disabled={isLoading}
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

              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !sentiment.trim()}
                className={`gap-3 text-lg px-8 py-6 ${!isLoading && sentiment.trim() && !error ? 'animate-gradient-button' : ''}`}
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
            </div>

            {error && (
              <p className="text-base text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {/* Curated Collection Results */}
        {isCurated && curatedNfts && curatedNfts.length > 0 && (
          <div className="space-y-8">
            {/* Interpretation - Typewriter effect */}
            {showInterpretation && (
              <div 
                className="text-center animate-in fade-in duration-500 flex items-center justify-center"
                style={{
                  minHeight: formHeight && !expandPanel ? `${formHeight}px` : 'auto'
                }}
              >
                <p className="text-2xl md:text-3xl font-bold leading-relaxed animate-pulse px-8">
                  {displayedText}
                  {isTyping && <span className="animate-pulse">|</span>}
                </p>
              </div>
            )}
            
            {/* Themes and Grid - Show after interpretation */}
            {showGrid && (
              <div className="space-y-6 animate-in fade-in duration-700">
                {/* Themes */}
                {curationThemes.length > 0 && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {curationThemes.map((theme) => (
                      <span key={theme} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Curated NFTs Grid */}
                <div 
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  onMouseMove={handleMouseMove}
                >
                  {curatedNfts.map((nft, index) => (
                    <div 
                      key={`${nft.contractAddress}-${nft.tokenId}-${index}`} 
                      className="group relative"
                      onMouseEnter={() => setHoveredNft(index)}
                      onMouseLeave={() => setHoveredNft(null)}
                    >
                      <a 
                        href={`https://opensea.io/assets/shape/${nft.contractAddress}/${nft.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="space-y-2">
                          {/* NFT Image */}
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted relative cursor-pointer">
                            {(nft.alchemyImages?.thumbnailUrl || nft.alchemyImages?.pngUrl || nft.imageUrl) ? (
                              <Image
                                src={nft.alchemyImages?.thumbnailUrl || nft.alchemyImages?.pngUrl || nft.imageUrl || ''}
                                alt={nft.name || 'NFT'}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Heart className="h-8 w-8" />
                              </div>
                            )}
                            
                            {/* Match Score Badge */}
                            <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                              {Math.round(nft.matchScore * 10)}%
                            </div>
                          </div>
                          
                          {/* Title */}
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm line-clamp-2 leading-tight">{nft.name || 'Unnamed NFT'}</h4>
                            <p className="text-xs text-muted-foreground">
                              Rank #{index + 1}
                            </p>
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Floating Popup */}
      {hoveredNft !== null && showGrid && (
        <div 
          ref={popupRef}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y + 20}px`,
          }}
        >
          <div className="p-4 bg-popover border rounded-lg shadow-lg w-80 max-w-[90vw]">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-1">{curatedNfts[hoveredNft].name || 'Unnamed NFT'}</h4>
                <p className="text-xs text-muted-foreground">
                  Token #{curatedNfts[hoveredNft].tokenId}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Heuristic Score</span>
                <span className="text-sm px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                  {curatedNfts[hoveredNft].matchScore.toFixed(2)}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p className="truncate" title={curatedNfts[hoveredNft].collectionName || curatedNfts[hoveredNft].contractAddress}>
                  {curatedNfts[hoveredNft].collectionName ? (
                    <>Collection: {curatedNfts[hoveredNft].collectionName}</>
                  ) : (
                    <>Collection: {curatedNfts[hoveredNft].contractAddress.slice(0, 6)}...{curatedNfts[hoveredNft].contractAddress.slice(-4)}</>
                  )}
                </p>
              </div>
              
              <div className="bg-muted/50 rounded p-2">
                <p className="text-xs">{curatedNfts[hoveredNft].reason}</p>
              </div>
              
              {/* Match Details */}
              {curatedNfts[hoveredNft].matchDetails && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  {curatedNfts[hoveredNft].matchDetails!.textMatches.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        📝 Word matches
                      </span>
                      <span className="text-xs">{curatedNfts[hoveredNft].matchDetails!.textMatches.length}</span>
                    </div>
                  )}

                  {curatedNfts[hoveredNft].matchDetails!.themeMatches.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        🎭 Theme matches
                      </span>
                      <span className="text-xs">{curatedNfts[hoveredNft].matchDetails!.themeMatches.length}</span>
                    </div>
                  )}
                  
                  {curatedNfts[hoveredNft].matchDetails!.visualMatches.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        🎨 Visual matches
                      </span>
                      <span className="text-xs">{curatedNfts[hoveredNft].matchDetails!.visualMatches.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}