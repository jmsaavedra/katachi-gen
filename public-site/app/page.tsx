'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import Image from 'next/image';
import Link from 'next/link';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Search } from 'lucide-react';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testAddressError, setTestAddressError] = useState('');
  const [shouldAutoRedirect, setShouldAutoRedirect] = useState(false);
  
  // Check if test mode is enabled via environment variable
  const isTestModeEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';

  // Update header state when generator visibility or wallet connection changes
  useEffect(() => {
    setShowWalletInHeader(showGenerator || isConnected);
    setIsInMintView(showGenerator);
  }, [showGenerator, isConnected, setShowWalletInHeader, setIsInMintView]);
  
  // Auto-redirect only when user connects wallet from this page
  useEffect(() => {
    if (isConnected && connectedAddress && shouldAutoRedirect) {
      setTestAddress(''); // Clear test address when wallet connects
      setTestAddressError('');
      setShowGenerator(true);
      setShouldAutoRedirect(false); // Reset the flag
    }
  }, [isConnected, connectedAddress, shouldAutoRedirect]);
  
  // Track when user initiates connection from this page
  const handleConnectClick = (openConnectModal: () => void) => {
    setShouldAutoRedirect(true); // Set flag to auto-redirect after connection
    openConnectModal();
  };
  
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
  
  const handleExploreClick = () => {
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
    setShowGenerator(true);
  };
  
  // Determine which address to use for the generator
  // Priority: connected wallet > test address
  const addressForGenerator = showGenerator ? (connectedAddress || testAddress) : undefined;

  if (showGenerator) {
    return (
      <KatachiGenerator 
        overrideAddress={addressForGenerator as `0x${string}` | undefined} 
        onGoHome={() => setShowGenerator(false)}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Background Video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-10"
      >
        <source src="/homepage-banner-opti.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay to reduce video brightness by 50% */}
      <div className="fixed inset-0 bg-black/50 -z-10" />
      
      <div className="w-full max-w-4xl space-y-12 relative z-10">
        {/* Hero Section */}
        <div className="space-y-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl font-[family-name:var(--font-montserrat)]">
            Katachi Gen <br />
            <span className="opacity-70 text-3xl sm:text-5xl font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
          </h1>
          
          {/* Japanese Etymology - Compact */}
          <div className="max-w-md mx-auto">
            <p className="text-white text-sm leading-relaxed">
              <strong className="text-white">Katachi</strong> <span className="text-white/70">(</span>カタチ<span className="text-white/70">)</span> = Shape/Form<br/>
              <strong className="text-white">Gen</strong> <span className="text-white/70">(</span>ゲン<span className="text-white/70">)</span> = To Appear/Manifest<br/>
              カタチ・ゲン = <strong className="text-white">Shape Revealed</strong>
            </p>
          </div>

          {/* Brief Description */}
          <p className="text-white text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-semibold">
            Transform your on-chain journey<br />into unique 3D origami patterns.
          </p>
        </div>

        {/* Two Column CTAs */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Primary CTA - Reveal Your Shape */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 bg-transparent backdrop-blur-md">
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-center">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold">Reveal Your Shape</h2>
                <p className="text-sm text-white/80">
                  Connect your wallet to generate your unique origami pattern
                </p>
              </div>
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button 
                      size="lg"
                      className="w-full gap-2 animate-gradient-button"
                      onClick={() => handleConnectClick(openConnectModal)}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full gap-2 animate-gradient-button"
                  onClick={() => setShowGenerator(true)}
                >
                  Generate Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Secondary CTA - Explore */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 bg-transparent backdrop-blur-md">
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-center">
                <Search className="h-16 w-16 text-white/80" />
              </div>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold">Explore</h2>
                <p className="text-sm text-white/80">
                  View example origami patterns from top collectors
                </p>
              </div>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full gap-2"
                onClick={handleExploreClick}
              >
                <Search className="h-4 w-4" />
                Explore Examples
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
