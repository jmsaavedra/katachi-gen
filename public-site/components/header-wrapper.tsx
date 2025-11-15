'use client';

import Image from 'next/image';
import Link from 'next/link';
import { WalletConnect } from '@/components/wallet-connect';
import { useHeader } from '@/contexts/header-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function HeaderWrapper() {
  const { showWalletInHeader, setIsInMintView, setShowWalletInHeader } = useHeader();

  const handleLogoClick = () => {
    // Reset mint view state and navigate to homepage
    setIsInMintView(false);
    setShowWalletInHeader(false);
    // Force a page refresh to reset all state
    window.location.href = '/';
  };

  return (
    <header className="fixed top-[72px] left-0 right-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
          <span className="text-xl font-bold font-[family-name:var(--font-montserrat)]">Katachi Gen</span>
          <span className="text-xl opacity-70 font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
        </button>
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="px-6 py-3 rounded-md text-lg font-bold">
                About
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-[90vw] max-h-[90vh] overflow-y-auto w-full">
              <DialogHeader>
                <DialogTitle className="text-3xl font-light">
                  About Katachi Gen
                </DialogTitle>
                <DialogDescription className="text-base pt-4">
                  カタチ・ゲン - Shape Revealed
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 text-left">
                <p className="text-base leading-relaxed">
                  Katachi Gen <span className="italic">(kah-TAH-chee gehn)</span> is a collection of digital + physical artifacts representing your on-chain journey, in the form of generative 3D origami patterns. Using AI sentiment analysis and art curation, each pattern reflects your personal participation on{' '}
                  <a 
                    href="https://shape.network" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Shape L2
                  </a>
                  , creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.
                </p>

                <div className="border-l-4 border-primary pl-6 space-y-2">
                  <p className="font-medium text-primary">
                    🏆{' '}
                    <a
                      href="https://shape.network/shapecraft"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Shapecraft2
                    </a>
                    {' '}Hackathon Submission
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Image src="/assets/matrix.gif" alt="" width={24} height={24} className="h-6 w-6" unoptimized />
                    <span className="text-muted-foreground">Built with passion for Shape Network</span>
                    <Image src="/assets/matrix.gif" alt="" width={24} height={24} className="h-6 w-6" unoptimized />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-semibold">How It Works</h3>
                  <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
                    <li>Connect your wallet to analyze your NFT collection on Shape Network</li>
                    <li>AI analyzes sentiment and patterns in your collection</li>
                    <li>A unique 3D origami pattern is generated based on your data</li>
                    <li>Mint your pattern as an NFT and download printable files</li>
                    <li>Fold your own physical origami from the generated pattern</li>
                  </ol>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xl font-semibold">Features</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Generative Art:</strong> Each pattern is algorithmically unique</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">AI-Powered:</strong> Sentiment analysis of your NFT collection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Physical Artifact:</strong> Download and fold your own origami</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Shape Native:</strong> Built specifically for Shape L2 ecosystem</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Created by{' '}
                    <a href="https://x.com/quietloops" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      @quietloops
                    </a>
                    {' '}and{' '}
                    <a href="https://x.com/1000b" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                      @sembo
                    </a>
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {showWalletInHeader && <WalletConnect />}
        </div>
      </div>
    </header>
  );
}