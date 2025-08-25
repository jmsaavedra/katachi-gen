'use client';

import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { useNFTsForOwner } from '@/hooks/web3';
import { useMintOrigami } from '@/hooks/useMintOrigami';
import { useStackMedals } from '@/hooks/useStackMedals';
// import { generatePlaceholderPattern } from '@/utils/generatePlaceholderSVG'; // Commented out - using katachi-generator service
import { chainConfig } from '@/lib/chains';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Package, Hash, ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react';
import Image from 'next/image';
import { CollectionReflection } from '@/components/collection-reflection';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

interface KatachiGeneratorProps {
  overrideAddress?: Address;
}

export function KatachiGenerator({ overrideAddress }: KatachiGeneratorProps = {}) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = overrideAddress || connectedAddress;
  const { data: nfts, isLoading, error } = useNFTsForOwner(addressToUse);
  const { data: stackMedals, isLoading: isLoadingMedals, error: medalsError } = useStackMedals(addressToUse);
  const [isGenerating, setIsGenerating] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [urlResolved, setUrlResolved] = useState(false);
  const [sentimentData, setSentimentData] = useState<{
    sentiment: string;
    filteredNfts: Array<{
      name: string | null;
      description: string | null;
      imageUrl: string | null;
      contractAddress: string;
      tokenId: string;
    }>;
  } | null>(null);
  const [curatedNfts, setCuratedNfts] = useState<Array<{
    tokenId: string;
    contractAddress: string;
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
  }> | null>(null);
  const [curationInterpretation, setCurationInterpretation] = useState<string>('');
  const [curationThemes, setCurationThemes] = useState<string[]>([]);
  const [generatedPattern, setGeneratedPattern] = useState<{
    htmlUrl: string;
    thumbnailUrl: string;
    metadata: {
      name: string;
      description: string;
      patternType: string;
      complexity: 'Basic' | 'Medium' | 'High' | 'Generated';
      foldLines: number;
      colors: string[];
      arweaveId?: string;
      curatedNfts?: Array<{
        name: string;
        description: string;
        image: string;
        contractAddress: string;
        tokenId: string;
      }>;
      traits: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
  } | null>(null);
  
  // Minting functionality
  const { 
    prepareMint, 
    executeMint, 
    isLoading: isMinting, 
    state: mintState,
    transactionHash,
    preparedData,
    reset: resetMint 
  } = useMintOrigami();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle iframe loading with retries for Arweave propagation
  useEffect(() => {
    if (generatedPattern?.htmlUrl) {
      setIframeLoading(true);
      setIframeError(false);
      setRetryCount(0);
      setUrlResolved(false); // Reset URL resolved state
      startArweaveCheck();
    }
  }, [generatedPattern?.htmlUrl]);

  const startArweaveCheck = async () => {
    if (!generatedPattern?.htmlUrl) return;
    
    const checkArweaveContent = async (attempt: number): Promise<void> => {
      const maxRetries = 20; // Try for about 100 seconds  
      const retryDelay = 5000; // 5 seconds between retries
      
      try {
        console.log(`Checking Arweave content (attempt ${attempt}/${maxRetries})...`);
        
        // Try a simple fetch to see if we get a response
        const response = await fetch(generatedPattern.htmlUrl, { 
          method: 'GET',
          mode: 'cors'  // Try CORS first to get actual response
        }).catch(() => null);
        
        // If we got a successful response, content is ready
        if (response && response.ok) {
          console.log('Arweave content is ready!');
          setUrlResolved(true); // URL is resolved, iframe can now be shown
          setIframeLoading(false);
          setIframeError(false);
          setRetryCount(0);
          return;
        }
        
      } catch (error) {
        console.log(`Arweave check failed: ${error}`);
      }
      
      if (attempt < maxRetries) {
        setRetryCount(attempt);
        
        // Start countdown
        setCountdown(retryDelay / 1000);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        setTimeout(() => {
          clearInterval(countdownInterval);
          checkArweaveContent(attempt + 1);
        }, retryDelay);
      } else {
        console.error('Max retries reached, content may still be propagating');
        setUrlResolved(true); // Allow iframe to try anyway after max retries
        setIframeLoading(false);
        setIframeError(false);
        setRetryCount(0);
      }
    };
    
    checkArweaveContent(1);
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
    setRetryCount(0);
  };

  const handleIframeError = () => {
    // Iframe error detected (likely 404), immediately show loading overlay
    console.log('Iframe error event triggered - showing retry overlay');
    setIframeLoading(true);
    setIframeError(false);
  };

  // Reset pagination when NFTs change
  useEffect(() => {
    setCurrentPage(1);
  }, [nfts?.totalCount]);

  const handleSentimentSubmitted = (sentiment: string, filteredNfts: Array<{
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    contractAddress: string;
    tokenId: string;
  }>) => {
    setSentimentData({
      sentiment,
      filteredNfts: filteredNfts.map(nft => ({
        name: nft.name,
        description: nft.description,
        imageUrl: nft.imageUrl,
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId
      }))
    });
  };

  const handleCurationCompleted = async (
    interpretation: string, 
    themes: string[], 
    nfts: Array<{
      tokenId: string;
      contractAddress: string;
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
    }>,
    sentiment?: string
  ) => {
    console.log('🎯 [DEBUG] handleCurationCompleted called with:', {
      interpretation: interpretation?.slice(0, 50) + '...',
      themesCount: themes?.length || 0,
      nftsCount: nfts?.length || 0,
      sentiment,
      currentSentimentData: sentimentData
    });
    
    setCuratedNfts(nfts);
    setCurationInterpretation(interpretation);
    setCurationThemes(themes);
    
    // If sentiment is provided, update sentiment data with the curated NFTs
    if (sentiment) {
      console.log('🎯 [DEBUG] Updating sentiment data with:', {
        sentiment,
        curatedNftsCount: nfts.length
      });
      setSentimentData({
        sentiment,
        filteredNfts: nfts.map(nft => ({
          name: nft.name,
          description: nft.description,
          imageUrl: nft.imageUrl,
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId
        }))
      });
    } else {
      console.warn('⚠️ [DEBUG] No sentiment provided to handleCurationCompleted');
    }
    
    // Wait a tick to ensure state updates are processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Automatically trigger generation after curation completes
    console.log('Curation completed, automatically starting generation...');
    await handleGenerateKatachi();
  };

  const handleGenerateKatachi = async () => {
    console.log('🎯 [DEBUG] handleGenerateKatachi called with sentimentData:', {
      hasSentimentData: !!sentimentData,
      sentiment: sentimentData?.sentiment,
      filteredNftsCount: sentimentData?.filteredNfts?.length || 0
    });
    
    if (!addressToUse) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sentimentData?.sentiment) {
      console.error('❌ [DEBUG] Missing sentiment data:', {
        sentimentData,
        hasSentimentData: !!sentimentData,
        sentiment: sentimentData?.sentiment
      });
      toast.error('Please share your collection sentiment below first');
      return;
    }

    setIsGenerating(true);
    resetMint(); // Reset any previous mint state
    
    try {
      // Get first 5 filtered NFT images for pattern generation
      const imageUrls = sentimentData.filteredNfts
        .slice(0, 5)
        .map(nft => ({ url: nft.imageUrl || '' }))
        .filter(img => img.url); // Remove empty URLs

      if (imageUrls.length === 0) {
        throw new Error('No valid NFT images found for pattern generation');
      }

      console.log('Calling katachi-generator with:', {
        walletAddress: addressToUse,
        imageCount: imageUrls.length
      });

      // Call katachi-generator API
      const response = await fetch('/api/generate-katachi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: addressToUse,
          seed2: `${stackMedals?.totalMedals || 0}`,
          sentiment: sentimentData.sentiment,
          totalNfts: nfts?.totalCount || 0,
          uniqueCollections: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0,
          images: imageUrls
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error || !result.success) {
        throw new Error(result.message || 'Pattern generation failed');
      }

      console.log('Katachi generation result:', {
        success: result.success,
        thumbnailId: result.thumbnailId,
        htmlId: result.htmlId,
        hasThumbnail: !!result.thumbnailId
      });

      // Create pattern data structure using Arweave URLs
      const patternData = {
        htmlUrl: result.htmlUrl || '',
        thumbnailUrl: result.thumbnailUrl || '',
        metadata: {
          name: `Katachi Gen #${result.thumbnailId?.slice(-8) || 'Unknown'}`,
          description: `Unique origami pattern generated from ${imageUrls.length} curated NFTs from your collection. Sentiment: ${sentimentData.sentiment}`,
          patternType: 'Origami',
          complexity: 'Generated' as const,
          foldLines: 0,
          colors: ['#000000', '#ffffff'],
          arweaveId: result.htmlId, // Store HTML Arweave ID for minting
          curatedNfts: sentimentData.filteredNfts.slice(0, 5).map(nft => ({
            name: nft.name || 'Untitled',
            description: nft.description || '',
            image: nft.imageUrl || '',
            contractAddress: nft.contractAddress,
            tokenId: nft.tokenId
          })),
          traits: [
            { trait_type: 'Sentiment Filter', value: sentimentData.sentiment },
            { trait_type: 'Stack Medals', value: stackMedals?.totalMedals || 0 },
            { trait_type: 'Unique Collections', value: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0 },
            { trait_type: 'Pattern Type', value: 'Origami' },
            { trait_type: 'Total NFTs', value: nfts?.totalCount || 0 }
          ]
        }
      };
      
      setGeneratedPattern(patternData);
      toast.success('Pattern generated successfully!');
    } catch (err) {
      toast.error('Failed to generate pattern');
      console.error('Pattern generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMintNFT = async () => {
    if (!generatedPattern || !addressToUse) {
      toast.error('No pattern generated or wallet not connected');
      return;
    }

    try {
      // First, prepare the mint transaction
      console.log('Preparing mint with data:', {
        recipientAddress: addressToUse,
        nftCount: nfts?.totalCount || 0,
        collections: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0,
        sentimentFilter: sentimentData?.sentiment,
        stackMedalsCount: stackMedals?.totalMedals || 0,
        curatedNftsCount: sentimentData?.filteredNfts?.length || 0,
      });
      
      const preparedResult = await prepareMint({
        recipientAddress: addressToUse,
        svgContent: generatedPattern.thumbnailUrl,
        name: generatedPattern.metadata.name,
        description: generatedPattern.metadata.description,
        nftCount: nfts?.totalCount || 0,
        collections: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0,
        sentimentFilter: sentimentData?.sentiment,
        stackMedalsCount: stackMedals?.totalMedals || 0,
        curatedNfts: sentimentData?.filteredNfts?.map(nft => ({
          name: nft.name || 'Untitled',
          description: nft.description || '',
          image: nft.imageUrl || '',
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId
        })) || [],
        arweaveData: {
          thumbnailId: generatedPattern.thumbnailId,
          htmlId: generatedPattern.htmlId,
          thumbnailUrl: generatedPattern.thumbnailUrl,
          htmlUrl: generatedPattern.htmlUrl,
          metadata: {
            name: generatedPattern.metadata.name,
            description: generatedPattern.metadata.description,
            attributes: generatedPattern.metadata.attributes
          }
        }
      });
      
      console.log('Mint prepared successfully, executing mint...');
      
      // Pass the prepared result directly to executeMint to avoid state timing issues
      await executeMint(preparedResult);
    } catch (err) {
      console.error('Mint error:', err);
      toast.error(`Mint failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDownloadPattern = () => {
    if (!generatedPattern?.htmlUrl) return;
    
    // Open the interactive HTML pattern in a new tab
    window.open(generatedPattern.htmlUrl, '_blank');
    toast.success('Pattern opened in new tab!');
  };

  // Pagination logic
  const totalNfts = nfts?.ownedNfts?.length || 0;
  const totalPages = Math.ceil(totalNfts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageNfts = nfts?.ownedNfts?.slice(startIndex, endIndex) || [];

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Show loading overlay while initial data is loading
  const isInitialLoading = isLoading || isLoadingMedals;

  return (
    <>
      {/* Loading Overlay */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Shapeの旅を読み込んでいます...</p>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-light">Mint a Katachi Gen</h2>
          <p className="text-muted-foreground">
            Your unique origami pattern based on your Shape journey
          </p>
        </div>

      <div className="grid md:grid-cols-[1fr_3fr] gap-8">
        {/* NFT Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Your Shape Journey
            </CardTitle>
            <CardDescription>
              Analysis of your on-chain participation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chain Info */}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
              📊 Reading from {chainConfig.read.name}<br />🎯 Minting to {chainConfig.mint.name}
              {config.mintChainId === 360 && !config.allowMainnetMinting && (
                <div className="text-orange-600 mt-1">⚠️ Mainnet minting disabled for safety</div>
              )}
            </div>
            
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : error ? (
              <p className="text-destructive">Failed to load NFTs</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total NFTs</span>
                  <span className="font-mono font-semibold">{nfts?.totalCount || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Unique Collections</span>
                  <span className="font-mono font-semibold">
                    {nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Pattern Complexity</span>
                  <span className="font-mono font-semibold">
                    {nfts?.totalCount ? (nfts.totalCount > 10 ? 'High' : nfts.totalCount > 5 ? 'Medium' : 'Basic') : 'Basic'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Stack Medal Count</span>
                  {isLoadingMedals ? (
                    <Skeleton className="h-4 w-8" />
                  ) : medalsError ? (
                    <span className="font-mono font-semibold text-destructive">Error</span>
                  ) : (
                    <span className="font-mono font-semibold">{stackMedals?.totalMedals || 0}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Reflection - AI Interpretation */}
        {nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
          <div>
            <CollectionReflection 
              walletAddress={addressToUse} 
              totalNfts={totalNfts}
              onSentimentSubmitted={handleSentimentSubmitted}
              onCurationCompleted={handleCurationCompleted}
            />
          </div>
        )}
      </div>

      {/* Curated NFTs Section - Full width above Origami Pattern */}
      {curatedNfts && curatedNfts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Curated Collection
            </CardTitle>
            <CardDescription>
              {curationInterpretation}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <div className="space-y-4">
              {curatedNfts.map((nft, index) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}-${index}`} className="border rounded-lg p-4">
                  <div className="flex gap-4">
                    {/* NFT Image */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted relative group">
                        {nft.imageUrl ? (
                          <Image
                            src={nft.imageUrl}
                            alt={nft.name || 'NFT'}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="80px"
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
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{nft.name || 'Unnamed NFT'}</h4>
                            <p className="text-xs text-muted-foreground">
                              Token #{nft.tokenId} • Rank #{index + 1}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
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
          </CardContent>
        </Card>
      )}

      {/* Pattern Generation - moved below the grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Origami Pattern
          </CardTitle>
          <CardDescription>
            Your unique Katachi Gen NFT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {!generatedPattern ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-32 h-32 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                  <Hash className="h-12 w-12 text-muted-foreground" />
                </div>
                <Button 
                  onClick={handleGenerateKatachi}
                  disabled={isGenerating || isLoading || !sentimentData?.sentiment}
                  className={`w-full max-w-xs ${sentimentData?.sentiment && !isGenerating ? 'animate-gradient-button' : ''}`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Pattern...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Katachi
                    </>
                  )}
                </Button>
                {!sentimentData?.sentiment ? (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Complete the Collection Reflection below to generate your pattern
                  </p>
                ) : (
                  <div className="text-xs text-green-600 text-center mt-2 flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Sentiment processed! Ready to generate.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left Column - SVG Preview */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Pattern Preview</h4>
                    <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 bg-muted/10 relative">
                      {generatedPattern.htmlUrl ? (
                        <>
                          {urlResolved && (
                            <iframe
                              key={`iframe-${retryCount}`}
                              src={generatedPattern.htmlUrl}
                              className="h-full w-full rounded-lg border-0"
                              title="Interactive Katachi Pattern"
                              sandbox="allow-scripts allow-same-origin"
                              onLoad={handleIframeLoad}
                              onError={handleIframeError}
                            />
                          )}
                          {!urlResolved && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                              <div className="text-center space-y-2">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                <div className="text-sm text-muted-foreground">
                                  {retryCount > 0 ? (
                                    <>Waiting for arweave... retrying in {countdown}s</>
                                  ) : (
                                    <>Loading interactive pattern...</>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {iframeError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                              <div className="text-center space-y-2">
                                <div className="text-sm text-destructive">
                                  Pattern failed to load. It may still be propagating on Arweave.
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => window.open(generatedPattern.htmlUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Open in new tab
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full w-full rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                          <span className="text-muted-foreground">Pattern Loading...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <button 
                        onClick={() => {
                          const iframe = document.querySelector('iframe[title="Interactive Katachi Pattern"]') as HTMLIFrameElement;
                          if (iframe && generatedPattern.htmlUrl) {
                            iframe.src = generatedPattern.htmlUrl + `?refresh=${Date.now()}`;
                          }
                        }}
                        className="underline hover:no-underline text-primary"
                      >
                        Refresh
                      </button>
                    </p>
                  </div>

                  {/* Right Column - Complete Metadata */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">NFT Metadata</h4>
                    
                    {/* Core Metadata */}
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">CORE METADATA</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">Name:</span>
                            <span className="font-mono text-xs ml-2 break-all">{generatedPattern.metadata.name}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-muted-foreground min-w-0 flex-shrink-0">Description:</span>
                            <span className="font-mono text-xs ml-2 text-right">{generatedPattern.metadata.description.slice(0, 100)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Traits */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">TRAITS ({generatedPattern.metadata.traits.length})</h5>
                        <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                          {generatedPattern.metadata.traits.map((trait, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0">
                              <span className="text-muted-foreground text-xs">{trait.trait_type}</span>
                              <span className="font-mono text-xs ml-2">
                                {typeof trait.value === 'string' && trait.value.length > 20 
                                  ? `${trait.value.slice(0, 20)}...` 
                                  : trait.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>


                      {/* Curated NFTs */}
                      {generatedPattern.metadata.curatedNfts && generatedPattern.metadata.curatedNfts.length > 0 && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">CURATED NFTS ({generatedPattern.metadata.curatedNfts.length})</h5>
                          <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                            {generatedPattern.metadata.curatedNfts.map((nft, i) => (
                              <div key={i} className="flex justify-between items-center py-1 border-b border-border/30 last:border-b-0">
                                <span className="text-muted-foreground text-xs">{nft.name || 'Unnamed'}</span>
                                <span className="font-mono text-xs ml-2">#{nft.tokenId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mint Status */}
                {mintState === 'success' && transactionHash && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center space-y-3">
                    <p className="text-green-800 text-sm font-semibold" style={{ color: '#166534' }}>NFT Minted Successfully! 🎉</p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => window.open(`${chainConfig.mint.explorer}/tx/${transactionHash}`, '_blank')}
                        className="gap-1 bg-green-700 hover:bg-green-800 text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Transaction
                      </Button>
                      {preparedData?.mintData?.metadata && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            const { contractAddress, tokenId, chainId } = preparedData.mintData.metadata;
                            const explorerBase = chainId === 11011 ? 'https://sepolia.shapescan.xyz' : 'https://shapescan.xyz';
                            const shapescanUrl = `${explorerBase}/token/${contractAddress}/instance/${tokenId}`;
                            window.open(shapescanUrl, '_blank');
                          }}
                          className="gap-1 bg-green-700 hover:bg-green-800 text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View NFT
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    className={`flex-1 gap-2 ${generatedPattern && !isMinting && mintState !== 'success' ? 'animate-gradient-button' : ''}`}
                    onClick={handleMintNFT}
                    disabled={isMinting || mintState === 'success'}
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mintState === 'preparing' ? 'Preparing...' : 
                         mintState === 'pending' ? 'Confirm in Wallet' :
                         mintState === 'confirming' ? 'Minting...' : 'Minting'}
                      </>
                    ) : mintState === 'success' ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Minted!
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Mint NFT
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2" 
                    onClick={handleDownloadPattern}
                  >
                    <Download className="h-4 w-4" />
                    Open Interactive Pattern
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* NFT Grid Preview with Pagination */}
      {nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your NFT Collection</span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalNfts} total NFTs
              </span>
            </CardTitle>
            <CardDescription>
              These NFTs influence your Katachi pattern
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {currentPageNfts.map((nft, index) => (
                <div key={`${nft.contract.address}-${nft.tokenId}-${index}`} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                  {nft.image?.thumbnailUrl ? (
                    <Image 
                      src={nft.image.thumbnailUrl} 
                      alt={nft.name || 'NFT'} 
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  {/* NFT Info Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-white text-xs font-medium truncate">{nft.name || 'Unnamed'}</p>
                    <p className="text-white/70 text-xs truncate">#{nft.tokenId}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalNfts)} of {totalNfts} NFTs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">of {totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}