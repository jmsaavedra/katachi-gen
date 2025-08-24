'use client';

import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { useNFTsForOwner } from '@/hooks/web3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletConnect } from '@/components/wallet-connect';
import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Package, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { CollectionReflection } from '@/components/collection-reflection';

interface KatachiGeneratorProps {
  overrideAddress?: Address;
}

export function KatachiGenerator({ overrideAddress }: KatachiGeneratorProps = {}) {
  const { address: connectedAddress } = useAccount();
  const addressToUse = overrideAddress || connectedAddress;
  const { data: nfts, isLoading, error } = useNFTsForOwner(addressToUse);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPattern, setGeneratedPattern] = useState<{
    complexity: number;
    foldLines: number;
    pattern: string;
    colors: string[];
  } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination when NFTs change
  useEffect(() => {
    setCurrentPage(1);
  }, [nfts?.totalCount]);

  const handleGenerateKatachi = async () => {
    setIsGenerating(true);
    
    // Simulate pattern generation
    setTimeout(() => {
      setGeneratedPattern({
        complexity: nfts?.totalCount || 0,
        foldLines: Math.floor(Math.random() * 50) + 20,
        pattern: 'kabuto',
        colors: generateColors(nfts?.totalCount || 0)
      });
      setIsGenerating(false);
    }, 3000);
  };

  const generateColors = (nftCount: number) => {
    const baseColors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    return baseColors.slice(0, Math.min(nftCount, 5));
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-light">Generate Your Katachi Gen</h2>
        <p className="text-muted-foreground">
          Your unique origami pattern based on your Shape journey
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <WalletConnect />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
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
                  <span className="text-muted-foreground">Stack Rank</span>
                  <span className="font-mono font-semibold">TBD</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pattern Generation */}
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
                  disabled={isGenerating || isLoading}
                  className="w-full max-w-xs"
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
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-square rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1">
                  <div className="h-full w-full rounded-lg bg-background flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="text-6xl">🗾</div>
                      <p className="text-sm text-muted-foreground">Kabuto Pattern #{Math.floor(Math.random() * 9999)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fold Lines</span>
                    <span className="font-mono">{generatedPattern.foldLines}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complexity</span>
                    <span className="font-mono">{generatedPattern.complexity > 10 ? 'High' : generatedPattern.complexity > 5 ? 'Medium' : 'Basic'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pattern Type</span>
                    <span className="font-mono capitalize">{generatedPattern.pattern}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" disabled>
                    Mint NFT (Coming Soon)
                  </Button>
                  <Button variant="outline" className="flex-1" disabled>
                    Download Pattern
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

      {/* Collection Reflection - AI Interpretation */}
      {nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
        <CollectionReflection 
          walletAddress={addressToUse} 
          totalNfts={totalNfts}
        />
      )}
    </div>
  );
}