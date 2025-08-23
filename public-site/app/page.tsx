'use client';

import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { WalletConnect } from '@/components/wallet-connect';
import { KatachiGenerator } from '@/components/katachi-generator';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-8 px-4">
      {!isConnected ? (
        <>
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
                By interpreting your wallet's ShapeL2 participation data, we generate 
                unique, foldable origami patterns that represent your on-chain journey. 
                Each NFT is both a digital collectible and a printable origami pattern 
                that can be brought to life.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <WalletConnect />
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">
              🏆 Shapecraft2 Hackathon Submission
            </p>
          </div>
        </>
      ) : (
        <KatachiGenerator />
      )}
    </div>
  );
}
