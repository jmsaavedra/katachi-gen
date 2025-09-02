'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Address } from 'viem';
import { shape, shapeSepolia } from 'viem/chains';
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
import { Loader2, Sparkles, Package, Hash, ChevronLeft, ChevronRight, ExternalLink, Eye, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { CollectionReflection } from '@/components/collection-reflection';
import { toast } from 'sonner';

interface KatachiGeneratorProps {
  overrideAddress?: Address;
}

export function KatachiGenerator({ overrideAddress }: KatachiGeneratorProps = {}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const addressToUse = overrideAddress || connectedAddress;

  // Debug logging for explore mode issue
  console.log('🐛 KatachiGenerator Debug:', {
    overrideAddress,
    connectedAddress,
    isConnected,
    addressToUse
  });

  // Get expected chain ID based on environment
  const expectedChainId = config.mintChainId === shape.id ? shape.id : shapeSepolia.id;
  const expectedChainName = config.mintChainId === shape.id ? 'Shape' : 'Shape Sepolia';
  
  // Check if user is on wrong network
  const isWrongNetwork = isConnected && !overrideAddress && chainId !== expectedChainId;
  const { data: nfts, isLoading, error } = useNFTsForOwner(addressToUse);
  const { data: stackMedals, isLoading: isLoadingMedals, error: medalsError } = useStackMedals(addressToUse);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [urlResolved, setUrlResolved] = useState(false);
  const [previewDelay, setPreviewDelay] = useState(false);
  const [previewCountdown, setPreviewCountdown] = useState(0);
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
    contractAddress: Address;
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    collectionName: string | null;
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
    metadataHtmlUrl: string;
    thumbnailUrl: string;
    thumbnailId: string;
    htmlId: string;
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
        image: string;
        contractAddress: string;
        tokenId: string;
      }>;
      attributes: Array<{
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

  // Handle preview delay when generator responds
  useEffect(() => {
    if (generatedPattern?.htmlUrl) {
      setIframeLoading(true);
      setIframeError(false);
      setUrlResolved(false); // Reset URL resolved state
      setPreviewDelay(false); // Reset preview delay state
      setPreviewCountdown(0); // Reset preview countdown
      
      // Start the 5-second preview delay immediately
      setPreviewDelay(true);
      setPreviewCountdown(5);
      setIframeLoading(false);
    }
  }, [generatedPattern?.htmlUrl]);

  // Handle preview delay countdown
  useEffect(() => {
    if (previewDelay && previewCountdown > 0) {
      const timer = setTimeout(() => {
        setPreviewCountdown(previewCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (previewDelay && previewCountdown === 0) {
      // Delay is over, now show the iframe
      setUrlResolved(true);
      setPreviewDelay(false);
    }
  }, [previewDelay, previewCountdown]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
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

  // Reset entire component state when wallet connects on mint page
  useEffect(() => {
    if (connectedAddress && !overrideAddress) {
      // Reset all component state to initial values
      setIsGenerating(false);
      setIframeLoading(false);
      setIframeError(false);
      setUrlResolved(false);
      setPreviewDelay(false);
      setPreviewCountdown(0);
      setSentimentData(null);
      setCuratedNfts(null);
      setCurationInterpretation('');
      setCurationThemes([]);
      setGeneratedPattern(null);
      setCurrentPage(1);
      resetMint(); // Reset mint state as well
    }
  }, [connectedAddress, overrideAddress, resetMint]);

  const handleSentimentSubmitted = (sentiment: string, filteredNfts: Array<{
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    contractAddress: string;
    tokenId: string;
  }>) => {
    console.log('🎯 [DEBUG] handleSentimentSubmitted called with:', {
      sentiment: sentiment,
      sentimentLength: sentiment?.length,
      filteredNftsCount: filteredNfts?.length,
      firstNft: filteredNfts?.[0]
    });
    
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
    
    setCuratedNfts(nfts?.map(nft => ({
      ...nft,
      contractAddress: nft.contractAddress as Address
    })) || null);
    setCurationInterpretation(interpretation);
    setCurationThemes(themes);
    
    // If sentiment is provided, update sentiment data with the curated NFTs
    if (sentiment) {
      console.log('🎯 [DEBUG] Updating sentiment data with:', {
        sentiment,
        curatedNftsCount: nfts.length
      });
      const newSentimentData = {
        ...sentimentData, // Preserve existing sentiment data
        sentiment,
        filteredNfts: nfts.map(nft => ({
          name: nft.name,
          description: nft.description,
          imageUrl: nft.imageUrl,
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId
        }))
      };
      
      setSentimentData(newSentimentData);
      
      // Automatically trigger generation with the new data immediately
      console.log('✅ Curation completed, triggering automatic generation...');
      await handleGenerateKatachiWithData(newSentimentData);
    } else {
      console.warn('⚠️ [DEBUG] No sentiment provided to handleCurationCompleted');
    }
  };

  const handleGenerateKatachiWithData = async (dataToUse: {
    sentiment: string;
    filteredNfts: Array<{
      name: string | null;
      description: string | null;
      imageUrl: string | null;
      contractAddress: string;
      tokenId: string;
    }>;
  }) => {
    console.log('🎯 [DEBUG] handleGenerateKatachiWithData called with:', {
      hasSentimentData: !!dataToUse,
      sentiment: dataToUse?.sentiment,
      filteredNftsCount: dataToUse?.filteredNfts?.length || 0
    });
    
    if (!addressToUse) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!dataToUse?.sentiment) {
      console.error('❌ [DEBUG] Missing sentiment data in passed parameter:', {
        dataToUse,
        hasSentimentData: !!dataToUse,
        sentiment: dataToUse?.sentiment
      });
      toast.error('Missing sentiment data');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Use the passed data instead of state
      const imageUrls = dataToUse.filteredNfts
        .slice(0, 5)
        .map(nft => ({ url: nft.imageUrl || '' }))
        .filter(img => img.url);

      if (imageUrls.length === 0) {
        throw new Error('No valid NFT images found for pattern generation');
      }

      console.log('Calling katachi-generator with:', {
        walletAddress: addressToUse,
        imageCount: imageUrls.length
      });

      const response = await fetch('/api/generate-katachi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: addressToUse,
          images: imageUrls,
          sentiment: dataToUse.sentiment,
          seed2: Math.random().toString(),
          stackMedals: stackMedals?.totalMedals || 0,
          totalNfts: nfts?.totalCount || 0,
          uniqueCollections: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
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

      console.log('🔍 [DEBUG] Raw generate-katachi API result:', {
        hasMetadata: !!result.metadata,
        metadataKeys: result.metadata ? Object.keys(result.metadata) : [],
        attributesCount: result.metadata?.attributes?.length || 0,
        name: result.metadata?.name,
        description: result.metadata?.description?.slice(0, 100) + '...'
      });

      // Create pattern data structure using response from generate-katachi API
      const patternData = {
        htmlUrl: result.previewHtmlUrl || result.htmlUrl || '', // Use preview URL for iframe
        metadataHtmlUrl: result.htmlUrl || '', // Keep original for metadata/tokenURI
        thumbnailUrl: result.thumbnailUrl || '',
        thumbnailId: result.thumbnailId || '',
        htmlId: result.htmlId || '',
        metadata: {
          // Use metadata from the API response if available, otherwise fallback
          name: result.metadata?.name || `Katachi Gen`,
          description: `Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey on ShapeL2, creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.\n\nhttps://katachi-gen.com`,
          patternType: 'Origami',
          complexity: 'Generated' as const,
          foldLines: 0,
          colors: ['#000000', '#ffffff'],
          arweaveId: result.htmlId, // Store HTML Arweave ID for minting
          // Store the complete metadata from the API for minting
          attributes: result.metadata?.attributes || [
            { trait_type: 'Sentiment Filter', value: dataToUse.sentiment },
            { trait_type: 'Stack Medals', value: stackMedals?.totalMedals || 0 },
            { trait_type: 'Unique Collections', value: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0 },
          ]
        },
        curated_nfts: dataToUse.filteredNfts.slice(0, 5).map(nft => ({
          name: nft.name || '',
          description: nft.description || '',
          image: nft.imageUrl || '',
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId
        }))
      };
      
      setGeneratedPattern(patternData);
      
      // Log final metadata that will be used for minting
      const finalMetadata = {
        name: patternData.metadata.name,
        description: patternData.metadata.description,
        attributes: patternData.metadata.attributes,
        image: patternData.thumbnailUrl,
        animation_url: patternData.metadataHtmlUrl, // Use Arweave URL for metadata
        external_url: patternData.metadataHtmlUrl, // Use Arweave URL for metadata
      };
      console.log('🎯 FINAL METADATA FOR MINTING:', JSON.stringify(finalMetadata, null, 2));
      
      toast.success('Pattern generated successfully!');
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      toast.error('Failed to generate katachi');
    } finally {
      setIsGenerating(false);
    }
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
          seed2: Math.random().toString(),
          stackMedals: stackMedals?.totalMedals || 0,
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

      console.log('🔍 [DEBUG] Raw generate-katachi API result:', {
        hasMetadata: !!result.metadata,
        metadataKeys: result.metadata ? Object.keys(result.metadata) : [],
        attributesCount: result.metadata?.attributes?.length || 0,
        name: result.metadata?.name,
        description: result.metadata?.description?.slice(0, 100) + '...'
      });

      // Create pattern data structure using response from generate-katachi API
      const patternData = {
        htmlUrl: result.previewHtmlUrl || result.htmlUrl || '', // Use preview URL for iframe
        metadataHtmlUrl: result.htmlUrl || '', // Keep original for metadata/tokenURI
        thumbnailUrl: result.thumbnailUrl || '',
        thumbnailId: result.thumbnailId || '',
        htmlId: result.htmlId || '',
        metadata: {
          // Use metadata from the API response if available, otherwise fallback
          name: result.metadata?.name || `Katachi Gen`,
          description: `Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey on ShapeL2, creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.\n\nhttps://katachi-gen.com`,
          patternType: 'Origami',
          complexity: 'Generated' as const,
          foldLines: 0,
          colors: ['#000000', '#ffffff'],
          arweaveId: result.htmlId, // Store HTML Arweave ID for minting
          // Store the complete metadata from the API for minting
          attributes: result.metadata?.attributes || [
            { trait_type: 'Sentiment Filter', value: sentimentData.sentiment },
            { trait_type: 'Stack Medals', value: stackMedals?.totalMedals || 0 },
            { trait_type: 'Unique Collections', value: nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0 },
            { trait_type: 'Pattern Type', value: 'Origami' },
            { trait_type: 'Total NFTs', value: nfts?.totalCount || 0 }
          ],
          curatedNfts: sentimentData.filteredNfts.slice(0, 5).map(nft => ({
            name: nft.name || 'Untitled',
            image: nft.imageUrl || '',
            contractAddress: nft.contractAddress,
            tokenId: nft.tokenId
          }))
        }
      };
      
      setGeneratedPattern(patternData);
      
      // Log final metadata that will be used for minting
      const finalMetadata = {
        name: patternData.metadata.name,
        description: patternData.metadata.description,
        attributes: patternData.metadata.attributes,
        image: patternData.thumbnailUrl,
        animation_url: patternData.metadataHtmlUrl, // Use Arweave URL for metadata
        external_url: patternData.metadataHtmlUrl, // Use Arweave URL for metadata
      };
      console.log('🎯 FINAL METADATA FOR MINTING:', JSON.stringify(finalMetadata, null, 2));
      
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
          image: nft.imageUrl || '',
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId
        })) || [],
        arweaveData: {
          thumbnailId: generatedPattern.thumbnailId,
          htmlId: generatedPattern.htmlId,
          thumbnailUrl: generatedPattern.thumbnailUrl,
          htmlUrl: generatedPattern.metadataHtmlUrl, // Use Arweave URL for minting
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
      
      {/* Wrong Network Modal */}
      {isWrongNetwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center gap-2 justify-center">
                <span>⚠️</span>
                Wrong Network
              </CardTitle>
              <CardDescription>
                Please switch to {expectedChainName} to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You&apos;re currently connected to the wrong network. Click below to switch to {expectedChainName}.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    try {
                      await switchChain({ chainId: expectedChainId });
                      toast.success(`Successfully switched to ${expectedChainName}`);
                    } catch (error) {
                      console.error('Network switch failed:', error);
                      toast.error('Failed to switch network. Please switch manually in your wallet.');
                    }
                  }}
                  className="flex-1"
                  size="lg"
                >
                  Switch to {expectedChainName}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border text-xs">
              <span>📊</span>
              <span className="text-muted-foreground">Reading from</span>
              <span className="font-medium">{chainConfig.read.name}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border text-xs">
              <span>🎯</span>
              <span className="text-muted-foreground">Minting to</span>
              <span className="font-medium">{chainConfig.mint.name}</span>
            </div>
            {config.mintChainId === 360 && !config.allowMainnetMinting && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 text-xs text-orange-600 dark:text-orange-400">
                <span>⚠️</span>
                <span className="font-medium">Mainnet minting disabled for safety</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-light">Mint a Katachi Gen</h2>
            <p className="text-muted-foreground">
              Your unique origami pattern based on your Shape journey
            </p>
          </div>
        </div>

      {/* Your Shape Journey - Full Width */}
      <Card>
        <CardHeader className="pt-1 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Package className="h-4 w-4" />
              Your Shape Journey
            </CardTitle>
            <CardDescription className="text-xs">
              Analysis of your on-chain participation
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </>
          ) : error ? (
            <p className="text-destructive">Failed to load NFTs</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center py-1.5 px-2 bg-muted/30 rounded-lg">
                <span className="font-mono font-semibold text-sm">{nfts?.totalCount || 0}</span>
                <span className="text-muted-foreground text-xs">Total NFTs</span>
              </div>
              <div className="flex flex-col items-center py-1.5 px-2 bg-muted/30 rounded-lg">
                <span className="font-mono font-semibold text-sm">
                  {nfts?.ownedNfts ? new Set(nfts.ownedNfts.map(nft => nft.contract.address)).size : 0}
                </span>
                <span className="text-muted-foreground text-xs">Unique Collections</span>
              </div>
              <div className="flex flex-col items-center py-1.5 px-2 bg-muted/30 rounded-lg">
                <span className="font-mono font-semibold text-sm">
                  {nfts?.totalCount ? (nfts.totalCount > 10 ? 'High' : nfts.totalCount > 5 ? 'Medium' : 'Basic') : 'Basic'}
                </span>
                <span className="text-muted-foreground text-xs">Pattern Complexity</span>
              </div>
              <div className="flex flex-col items-center py-1.5 px-2 bg-muted/30 rounded-lg">
                {isLoadingMedals ? (
                  <Skeleton className="h-4 w-8" />
                ) : medalsError ? (
                  <span className="font-mono font-semibold text-sm text-destructive">Error</span>
                ) : (
                  <span className="font-mono font-semibold text-sm">{stackMedals?.totalMedals || 0}</span>
                )}
                <span className="text-muted-foreground text-xs">Stack Medals</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collection Reflection - AI Interpretation - Full Width */}
      {nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
        <CollectionReflection 
          walletAddress={addressToUse} 
          totalNfts={totalNfts}
          onSentimentSubmitted={handleSentimentSubmitted}
          onCurationCompleted={handleCurationCompleted}
          curatedNfts={curatedNfts || undefined}
          curationInterpretation={curationInterpretation}
          curationThemes={curationThemes}
        />
      )}


      {/* Pattern Generation - moved below the grid */}
      {sentimentData && (
      <Card className={sentimentData && mintState !== 'success' ? "pulse-blue-border" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-yellow-500 animate-pulse" />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              Step 2: Generate and Mint
            </span>
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
                    Sentiment curation complete. Generating Katachi Gen...
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mobile: Full width iframe */}
                <div className="md:hidden space-y-4 -mx-6">
                  <h4 className="font-medium text-sm px-6">Interactive NFT Preview</h4>
                  <div className="aspect-square border-2 border-dashed border-muted-foreground/20 bg-muted/10 relative">
                    {generatedPattern.htmlUrl ? (
                      <>
                        {urlResolved && (
                          <iframe
                            key={`iframe-${generatedPattern.htmlId}`}
                            src={generatedPattern.htmlUrl}
                            className="h-full w-full border-0"
                            title="Interactive Katachi Pattern"
                            sandbox="allow-scripts allow-same-origin"
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                          />
                        )}
                        {!urlResolved && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                            <div className="text-center space-y-2">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                              <div className="text-sm text-muted-foreground">
                                {previewDelay ? (
                                  <>Generating your Katachi Gen... {previewCountdown}s</>
                                ) : (
                                  <>Loading interactive pattern...</>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {iframeError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                            <div className="text-center space-y-2">
                              <div className="text-sm text-destructive">
                                Pattern failed to load. It may still be propagating on Arweave.
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(generatedPattern.htmlUrl, '_blank')}
                              >
                                Open in New Tab
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Hash className="h-12 w-12 text-muted-foreground mx-auto" />
                          <div className="text-sm text-muted-foreground">Pattern will appear here</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Desktop: Two Column Layout */}
                <div className="hidden md:grid md:grid-cols-2 gap-8">
                  {/* Left Column - SVG Preview */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Interactive NFT Preview</h4>
                    <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 bg-muted/10 relative">
                      {generatedPattern.htmlUrl ? (
                        <>
                          {urlResolved && (
                            <iframe
                              key={`iframe-${generatedPattern.htmlId}`}
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
                                  {previewDelay ? (
                                    <>Generating your Katachi Gen... {previewCountdown}s</>
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
                    <div className="flex justify-between items-center mt-2">
                      <button 
                        onClick={() => window.open(generatedPattern.htmlUrl, '_blank')}
                        className="text-xs text-muted-foreground underline hover:no-underline text-primary flex items-center gap-1"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => {
                          console.log('🔄 Refresh button clicked');
                          // Find all iframes with the specific title
                          const iframes = document.querySelectorAll('iframe[title="Interactive Katachi Pattern"]') as NodeListOf<HTMLIFrameElement>;
                          console.log('🔍 Found iframes:', iframes.length);
                          
                          if (iframes.length > 0 && generatedPattern?.htmlUrl) {
                            // Refresh all matching iframes (handles multiple viewport cases)
                            iframes.forEach((iframe, index) => {
                              const refreshUrl = generatedPattern.htmlUrl + `?refresh=${Date.now()}`;
                              console.log(`🔄 Refreshing iframe ${index + 1}:`, refreshUrl);
                              iframe.src = refreshUrl;
                            });
                          } else {
                            console.error('❌ No iframe found or missing htmlUrl');
                          }
                        }}
                        className="text-xs text-muted-foreground hover:text-primary"
                        title="Refresh preview"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
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
                        <h5 className="text-xs font-medium text-muted-foreground mb-2">TRAITS ({generatedPattern.metadata.attributes.length})</h5>
                        <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                          {generatedPattern.metadata.attributes.map((trait, i) => (
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
                    className={`flex-1 gap-2 py-8 text-lg ${generatedPattern && !isMinting && mintState !== 'success' && !(overrideAddress && !connectedAddress) ? 'animate-gradient-button' : ''}`}
                    onClick={handleMintNFT}
                    disabled={isMinting || mintState === 'success' || (overrideAddress && !connectedAddress)}
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {mintState === 'preparing' ? 'Preparing...' : 
                         mintState === 'pending' ? 'Confirm in Wallet' :
                         mintState === 'confirming' ? 'Minting...' : 'Minting'}
                      </>
                    ) : mintState === 'success' ? (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Minted!
                      </>
                    ) : overrideAddress && !connectedAddress ? (
                      <span className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-2">
                          <Eye className="h-4 w-4 md:h-5 md:w-5" />
                          <span className="text-sm md:text-lg">Explore Mode</span>
                        </span>
                        <span className="text-xs md:text-sm">Connect Wallet to Mint</span>
                      </span>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        MINT for .0025 ETH
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
      )}

      {/* NFT Grid Preview with Pagination */}
      {sentimentData && nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
        <Card style={{ display: 'none' }}>
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