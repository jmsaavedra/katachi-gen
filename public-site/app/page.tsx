'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Origami } from 'lucide-react';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [shouldAutoRedirect, setShouldAutoRedirect] = useState(false);

  // Background origami options - randomly select one on page load
  const backgroundOptions = [
    'https://storage.katachi-gen.com/kg_flower-0xeE49f82e58A1C2B306720D0c68047CBf70C11FB5-1763264870408.html',
    'https://storage.katachi-gen.com/kg_pinwheel-0xeE49f82e58A1C2B306720D0c68047CBf70C11FB5-1763263958900.html',
  ];
  const [backgroundUrl] = useState(() =>
    backgroundOptions[Math.floor(Math.random() * backgroundOptions.length)]
  );

  // Capture wheel events to enable page scrolling while iframe handles mouse movements
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only handle if not scrolling within an interactive element
      const target = e.target as HTMLElement;
      if (!target.closest('.pointer-events-auto')) {
        window.scrollBy(0, e.deltaY);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Update header state when generator visibility or wallet connection changes
  useEffect(() => {
    setShowWalletInHeader(showGenerator || isConnected);
    setIsInMintView(showGenerator);
  }, [showGenerator, isConnected, setShowWalletInHeader, setIsInMintView]);

  // Auto-redirect only when user connects wallet from this page
  useEffect(() => {
    if (isConnected && connectedAddress && shouldAutoRedirect) {
      setTestAddress(''); // Clear test address when wallet connects
      setShowGenerator(true);
      setShouldAutoRedirect(false); // Reset the flag
    }
  }, [isConnected, connectedAddress, shouldAutoRedirect]);
  
  // Track when user initiates connection from this page
  const handleConnectClick = (openConnectModal: () => void) => {
    setShouldAutoRedirect(true); // Set flag to auto-redirect after connection
    openConnectModal();
  };

  const handleExploreClick = () => {
    const topWallets = [
      '0x9f6ae0370d74f0e591c64cec4a8ae0d627817014',
      '0xeE49f82e58A1C2B306720D0c68047CBf70C11FB5',
      '0x136bbfe37988f82f8585ed155615b75371489d45',
      '0xd20ce27f650598c2d790714b4f6a7222b8ddce22'
    ];
    const randomWallet = topWallets[Math.floor(Math.random() * topWallets.length)];

    setTestAddress(randomWallet);
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
    <>
      {/* Background iframe - interactive/draggable */}
      <iframe
        src={backgroundUrl}
        className="fixed inset-0 w-full h-full border-0"
        style={{ zIndex: 0 }}
        title="Background animation"
      />

      {/* Dark overlay to reduce brightness by 50% - clicks pass through to iframe */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none" style={{ zIndex: 1 }} />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 pointer-events-none" style={{ zIndex: 2 }}>
        <div className="w-full max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="space-y-6 text-center pointer-events-none">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl font-[family-name:var(--font-montserrat)]">
            Katachi Gen <br />
            <span className="opacity-70 text-3xl sm:text-5xl font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
          </h1>
          
          {/* Japanese Etymology - Compact */}
          <div className="max-w-md mx-auto relative">
            <div
              className="absolute inset-0 bg-black/50 blur-3xl -m-8"
              style={{ zIndex: -1 }}
            />
            <p className="text-white text-lg md:text-xl leading-relaxed relative">
              <strong className="text-white">Katachi</strong> <span className="text-white/70">(</span>カタチ<span className="text-white/70">)</span> = Shape/Form<br/>
              <strong className="text-white">Gen</strong> <span className="text-white/70">(</span>ゲン<span className="text-white/70">)</span> = To Appear/Manifest<br/>
              カタチ・ゲン = <strong className="text-white">Shape Revealed</strong>
            </p>
          </div>

          {/* Brief Description */}
          <p className="text-white text-2xl md:text-3xl max-w-2xl mx-auto leading-relaxed font-semibold">
            Generative 3D Origami artifacts of your collection on Shape, co-curated by you and AI.
          </p>
        </div>

        {/* Two Column CTAs */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Primary CTA - Reveal Your Shape */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 bg-transparent backdrop-blur-md pointer-events-auto">
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-center">
                <Origami className="h-16 w-16 text-primary" />
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
          <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 bg-transparent backdrop-blur-md pointer-events-auto">
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-center">
                <Sparkles className="h-16 w-16 text-white/80" />
              </div>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold">Explore</h2>
                <p className="text-sm text-white/80">
                  Share your sentiment and curate a collection of Shape artworks. No wallet needed!
                </p>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2"
                onClick={handleExploreClick}
              >
                <Sparkles className="h-4 w-4" />
                Try it now
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
