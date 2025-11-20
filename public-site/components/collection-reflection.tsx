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
  const [isCurating, setIsCurating] = useState(false); // New state for Tool 2
  const [curationComplete, setCurationComplete] = useState(false);
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

  // Typewriter effect with pauses between sentences
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
        const currentChar = textToType[currentIndexRef.current];
        const nextChar = textToType[currentIndexRef.current + 1];

        currentIndexRef.current++;
        // Convert \n to <div> with margin for proper spacing
        const displayText = textToType.slice(0, currentIndexRef.current)
          .split('\n')
          .map((line, i, arr) => i < arr.length - 1 ? `<div style="margin-bottom: 0.75em;">${line}</div>` : line)
          .join('');
        setDisplayedText(displayText);
        console.log('Typing progress:', currentIndexRef.current, '/', textToType.length);
        if (currentChar === '\n') {
          console.log('Found newline at position', currentIndexRef.current);
        }

        // Check if we just completed a sentence (period, exclamation, or question mark followed by space or newline)
        // Also check for double newline which indicates paragraph break
        const isEndOfSentence = (currentChar === '.' || currentChar === '!' || currentChar === '?') &&
                               (nextChar === ' ' || nextChar === '\n' || !nextChar);
        const isDoubleNewline = currentChar === '\n' && nextChar === '\n';

        let delay;
        if (isDoubleNewline) {
          // Pause for paragraph breaks (1 second)
          delay = 1000;
        } else if (isEndOfSentence) {
          // Pause for 1 second at end of sentences
          delay = 1000;
        } else {
          // Random delay between 30-80ms to simulate typing (faster)
          delay = 30 + Math.random() * 50;
        }

        setTimeout(typeNextCharacter, delay);
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
      // STEP 1: Extract themes and get initial interpretation (fast, ~2-5s)
      console.log('🎨 Step 1: Extracting themes...');
      const themesResponse = await fetch('/api/extract-themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentiment: sentiment.trim(),
        }),
      });

      if (!themesResponse.ok) {
        throw new Error(`Failed to extract themes: ${themesResponse.statusText}`);
      }

      const themesData = await themesResponse.json();

      if (themesData.error) {
        throw new Error(themesData.message || 'Failed to extract themes');
      }

      console.log('✅ Themes extracted:', themesData.themes);

      // Button now shows "Curating your collection..."
      setIsLoading(false);
      setIsCurating(true);

      // STEP 2: Curate NFTs (heavy, ~10-30s)
      console.log('🔍 Step 2: Curating NFTs...');
      const curateResponse = await fetch('/api/curate-nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          themes: themesData.themes,
          sentiment: sentiment.trim(),
          count: parseInt(count),
        }),
      });

      if (!curateResponse.ok) {
        throw new Error(`Failed to curate NFTs: ${curateResponse.statusText}`);
      }

      const curateData = await curateResponse.json();

      if (curateData.error) {
        throw new Error(curateData.message || 'Failed to curate NFTs');
      }

      console.log('✅ NFTs curated:', curateData.selectedNfts?.length || 0);

      // Both tools complete - now show UI transition
      setIsCurating(false);
      setIsCurated(true);
      hasStartedTyping.current = false;

      // Capture current form height before fade out
      if (formRef.current) {
        setFormHeight(formRef.current.offsetHeight);
      }

      // Start fade out animation for subtitle and form
      setFadeOutSubtitle(true);

      // Notify parent with final curated data
      if (onCurationCompleted) {
        onCurationCompleted(
          curateData.interpretation || themesData.interpretation,
          curateData.themes || themesData.themes,
          curateData.selectedNfts || [],
          sentiment.trim()
        );
      }

      // Notify parent that sentiment has been processed
      if (onSentimentSubmitted) {
        onSentimentSubmitted(sentiment.trim(), curateData.selectedNfts || []);
      }

      // Set curation complete state
      setCurationComplete(true);

      // After 2s fade out, hide form completely and show interpretation
      setTimeout(() => {
        setShowSubtitle(false);
        setHideForm(true);
        setShowInterpretation(true);
      }, 2000);

      // Grid and Step 2 will be shown by the typewriter effect
    } catch (err) {
      console.error('Error interpreting sentiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to interpret your collection sentiment');
      setIsLoading(false);
      setIsCurating(false);
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
            Step 1: Sentiment Curation
          </span>
        </CardTitle>
        {showSubtitle && (
          <CardDescription 
            className="text-base transition-opacity duration-[2000ms]"
            style={{ opacity: fadeOutSubtitle ? 0 : 1 }}
          >
            <span className="block md:inline">
              Share your feelings about collecting on Shape. Feel free to write as little or as much as you&apos;d like!
            </span>
            <span className="block md:inline mt-2 md:mt-0">
              Our AI will interpret your response and curate up to 8 pieces from your collection based on sentiment heuristics.
            </span>
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
                  placeholder="ex: Collecting art is my way of participating in culture as it's being written. Collecting on Shape creates a provable legacy, one that supports artists and grows our creative community."
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
                disabled={isLoading || isCurating || curationComplete || !sentiment.trim()}
                className={`gap-3 text-lg px-8 py-6 ${!isLoading && !isCurating && !curationComplete && sentiment.trim() && !error ? 'animate-gradient-button' : ''}`}
              >
                {curationComplete ? (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Curation Complete.
                  </>
                ) : isCurating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Curating your collection...
                  </>
                ) : isLoading ? (
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
                <p
                  className="text-xl md:text-2xl font-bold animate-pulse"
                  style={{ lineHeight: '1.25' }}
                  dangerouslySetInnerHTML={{
                    __html: displayedText + (isTyping ? '<span class="animate-pulse">|</span>' : '')
                  }}
                />
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
