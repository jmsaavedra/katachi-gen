'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Code } from 'lucide-react';
import Image from 'next/image';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testAddressError, setTestAddressError] = useState('');
  
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
                  className="gap-3 px-24 py-8 text-xl animate-gradient-button w-80"
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
              className="gap-3 px-24 py-8 text-xl animate-gradient-button w-80"
              onClick={handleMintClick}
            >
              <Sparkles className="h-6 w-6" />
              Mint Your Katachi Gen 形現
            </Button>
          )}
        </div>
        
        {/* Test Mode */}
        {isTestModeEnabled && (
          <Card className="w-full max-w-md mx-auto border-dashed border-muted-foreground/20 bg-muted/30">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Code className="h-4 w-4" />
                  Test Mode
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interactive Preview */}
      <div className="mt-12 mb-8">
        <div className="flex flex-col items-center">
          <a
            href="https://arweave.net/r2a9VewIG36G7Z3gGMWoxNnF09WrnaoR_L8gRlSVQ0I"
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-lg overflow-hidden border bg-card shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            style={{ width: '750px', height: '750px', display: 'block' }}
          >
            <Image
              src="/assets/r2a9VewIG36G7Z3gGMWoxNnF09WrnaoR_L8gRlSVQ0I-landing.gif"
              alt="Katachi Gen Interactive Demo"
              width={750}
              height={750}
              className="w-full h-full object-cover"
              unoptimized
            />
          </a>
          <a
            href="https://arweave.net/r2a9VewIG36G7Z3gGMWoxNnF09WrnaoR_L8gRlSVQ0I"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-sm text-primary hover:underline font-medium"
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
