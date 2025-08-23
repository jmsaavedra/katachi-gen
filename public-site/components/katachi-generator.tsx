'use client';

import { useAccount } from 'wagmi';
import { useNFTsForOwner } from '@/hooks/web3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletConnect } from '@/components/wallet-connect';
import { useState } from 'react';
import { Loader2, Sparkles, Package, Hash } from 'lucide-react';
import Image from 'next/image';

export function KatachiGenerator() {
  const { address } = useAccount();
  const { data: nfts, isLoading, error } = useNFTsForOwner(address);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPattern, setGeneratedPattern] = useState<{
    complexity: number;
    foldLines: number;
    pattern: string;
    colors: string[];
  } | null>(null);

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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-light">Generate Your Katachi</h2>
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

      {/* NFT Grid Preview */}
      {nfts && nfts.ownedNfts && nfts.ownedNfts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your NFT Collection</CardTitle>
            <CardDescription>
              These NFTs influence your Katachi pattern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {nfts.ownedNfts.slice(0, 12).map((nft, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                  {nft.image?.thumbnailUrl ? (
                    <Image 
                      src={nft.image.thumbnailUrl} 
                      alt={nft.name || 'NFT'} 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {nfts.ownedNfts.length > 12 && (
              <p className="text-center text-muted-foreground text-sm mt-4">
                And {nfts.ownedNfts.length - 12} more...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}