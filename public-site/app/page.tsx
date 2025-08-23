'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/wallet-connect';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const { isConnected } = useAccount();
  const [showGenerator, setShowGenerator] = useState(false);

  if (showGenerator) {
    return <KatachiGenerator />;
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-8 px-4">
      <div className="space-y-6 text-center max-w-3xl">
        <h1 className="text-5xl font-light tracking-tight sm:text-7xl">
          Katachi Gen <span className="opacity-70">形現</span>
        </h1>
        <p className="text-muted-foreground text-xl font-light">
          Shape Revealed
        </p>
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-muted-foreground text-lg leading-relaxed">
            An NFT collection of algorithmically generated 3D Origami forms 
            representing your on-chain journey on Shape.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed">
            By interpreting your wallet&apos;s ShapeL2 participation data, we generate 
            unique, foldable origami patterns that represent your on-chain journey. 
            Each NFT is both a digital collectible and a printable origami pattern 
            that can be brought to life.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {!isConnected ? (
          <WalletConnect />
        ) : (
          <Button 
            size="lg" 
            className="gap-2 px-8"
            onClick={() => setShowGenerator(true)}
          >
            <Sparkles className="h-4 w-4" />
            Mint Your Katachi Gen
          </Button>
        )}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground text-sm">
          🏆 Shapecraft2 Hackathon Submission
        </p>
      </div>
    </div>
  );
}
