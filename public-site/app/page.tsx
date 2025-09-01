'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Code, ChevronRight, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testAddressError, setTestAddressError] = useState('');
  const [currentIframeIndex, setCurrentIframeIndex] = useState(0);
  
  // Check if test mode is enabled via environment variable
  const isTestModeEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';
  
  // Debug logging
  console.log('NEXT_PUBLIC_ENABLE_TEST_MODE:', process.env.NEXT_PUBLIC_ENABLE_TEST_MODE);
  console.log('isTestModeEnabled:', isTestModeEnabled);

  // Update header state when generator visibility changes
  useEffect(() => {
    setShowWalletInHeader(showGenerator);
    setIsInMintView(showGenerator);
  }, [showGenerator, setShowWalletInHeader, setIsInMintView]);
  
  // Auto-navigate to generator when wallet connects
  useEffect(() => {
    if (isConnected && connectedAddress) {
      setShowGenerator(true);
    }
  }, [isConnected, connectedAddress]);
  
  const handleTestAddressSubmit = () => {
    if (!testAddress.trim()) {
      setTestAddressError('Please enter a wallet address');
      return;
    }
    
    if (!isAddress(testAddress)) {
      setTestAddressError('Please enter a valid Ethereum address');
      return;
    }
    
    setTestAddressError('');
    setShowGenerator(true);
  };
  
  const handleMintClick = () => {
    setShowGenerator(true);
  };
  
  // Determine which address to use for the generator
  const addressForGenerator = showGenerator ? (testAddress || connectedAddress) : undefined;

  if (showGenerator) {
    return <KatachiGenerator overrideAddress={addressForGenerator as `0x${string}` | undefined} />;
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
          <p className="text-muted-foreground text-xl leading-relaxed">
            Katachi Gen transforms your NFT collection into unique 3D origami patterns through sentiment analysis and AI curation. Each pattern reflects your personal collecting journey on ShapeL2, creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <p className="text-center text-muted-foreground text-xl leading-relaxed max-w-md mx-auto">
          <strong>Katachi</strong> (形) = Shape/Form in Japanese<br/>
          <strong>Gen</strong> (現) = To Appear/Manifest<br/>
          Together: <strong>Shape Revealed</strong>
        </p><br></br>
        
        <div className="flex justify-center">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button 
                  size="lg"
                  className="gap-3 px-24 py-8 text-xl animate-gradient-button w-full max-w-md"
                  onClick={openConnectModal}
                >
                  <Sparkles className="h-6 w-6" />
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          ) : (
            <Button 
              size="lg" 
              className="gap-3 px-24 py-8 text-xl animate-gradient-button w-full max-w-md"
              onClick={handleMintClick}
            >
              <Sparkles className="h-6 w-6" />
              Mint Your Katachi Gen 形現
            </Button>
          )}
        </div>
        
        {/* Test Mode */}
        {isTestModeEnabled && (
          <Card className="w-full max-w-md mx-auto mt-10 border-dashed border-muted-foreground/20 bg-muted/30">
            <CardContent className="pt-0 pb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Code className="h-4 w-4" />
                  Try in Explore Mode
                </div>
                <p className="text-xs text-muted-foreground/80">
                  Test with any wallet address (bypasses wallet connection)
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="0x1234...abcd"
                    value={testAddress}
                    onChange={(e) => {
                      setTestAddress(e.target.value);
                      setTestAddressError('');
                    }}
                    className={`text-sm ${testAddressError ? 'border-destructive' : ''}`}
                  />
                  {testAddressError && (
                    <p className="text-xs text-destructive">{testAddressError}</p>
                  )}
                  <Button
                    size="sm"
                    onClick={handleTestAddressSubmit}
                    className="w-full gap-2"
                    variant="secondary"
                    disabled={!testAddress.trim()}
                  >
                    <Sparkles className="h-3 w-3" />
                    Test Generate
                  </Button>
                  
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground/80 text-center">
                      Or, explore a random top collector wallet:
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        const topWallets = [
                          '0x136bbfe37988f82f8585ed155615b75371489d45',
                          '0x53bebd20781aaa3a831f45b3c6889010a706ff9f',
                          '0x72fe3c398c9a030b9b2be1fe1ff07701167571d4',
                          '0xee49f82e58a1c2b306720d0c68047cbf70c11fb5',
                          '0x51360d99966724b2603182cc367ab9621d96eed2',
                          '0xc68c7771ec6a6e5d67d62aa9c6f22df69865e401'
                        ];
                        const randomWallet = topWallets[Math.floor(Math.random() * topWallets.length)];
                        setTestAddress(randomWallet);
                        setTestAddressError('');
                        // Immediately navigate to the generator view
                        setShowGenerator(true);
                      }}
                      className="w-full"
                      variant="outline"
                    >
                      Explore
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interactive Preview */}
      <div className="mt-12 mb-8">
        {/* Desktop: Show both iframes side by side */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex gap-6 justify-center">
            <div className="flex flex-col items-center">
              <div className="relative rounded-lg overflow-hidden border bg-card shadow-lg">
                <iframe
                  src="https://storage.katachi-gen.com/nfts/nft_1756716744296.html"
                  width="600"
                  height="600"
                  className="border-0 bg-transparent"
                  title="Katachi Gen Interactive Demo 1"
                  allowFullScreen
                />
              </div>
              <a
                href="https://storage.katachi-gen.com/nfts/nft_1756716744296.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-sm text-primary hover:underline font-medium"
              >
                View live interactive token →
              </a>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative rounded-lg overflow-hidden border bg-card shadow-lg">
                <iframe
                  src="https://storage.katachi-gen.com/katachi_1756737150668.html"
                  width="600"
                  height="600"
                  className="border-0 bg-transparent"
                  title="Katachi Gen Interactive Demo 2"
                  allowFullScreen
                />
              </div>
              <a
                href="https://storage.katachi-gen.com/katachi_1756737150668.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-sm text-primary hover:underline font-medium"
              >
                View live interactive token →
              </a>
            </div>
          </div>
        </div>

        {/* Mobile: Show one iframe with pagination */}
        <div className="md:hidden flex flex-col items-center">
          <div className="relative rounded-lg overflow-hidden border bg-card shadow-lg">
            <iframe
              src={currentIframeIndex === 0 
                ? "https://storage.katachi-gen.com/nfts/nft_1756716744296.html"
                : "https://storage.katachi-gen.com/katachi_1756737150668.html"
              }
              width="350"
              height="350"
              className="border-0 bg-transparent"
              title={`Katachi Gen Interactive Demo ${currentIframeIndex + 1}`}
              allowFullScreen
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            {currentIframeIndex > 0 && (
              <button
                onClick={() => setCurrentIframeIndex(0)}
                className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
            )}
            {currentIframeIndex < 1 && (
              <button
                onClick={() => setCurrentIframeIndex(1)}
                className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <a
            href={currentIframeIndex === 0 
              ? "https://storage.katachi-gen.com/nfts/nft_1756716744296.html"
              : "https://storage.katachi-gen.com/katachi_1756737150668.html"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-sm text-primary hover:underline font-medium"
          >
            View live interactive token →
          </a>
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground text-sm">
          🏆 Shapecraft2 Hackathon Submission
        </p>
      </div>
    </div>
  );
}
