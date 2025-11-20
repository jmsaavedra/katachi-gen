'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { KatachiGenerator } from '@/components/katachi-generator';
import { FoldLoadingOverlay } from '@/components/fold-loading-overlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Origami, Wallet } from 'lucide-react';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [isMintReady, setIsMintReady] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [shouldAutoRedirect, setShouldAutoRedirect] = useState(false);
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const backgroundReadyTimeout = useRef<number | null>(null);
  const fallbackTimeout = useRef<number | null>(null);

  // Background origami options - randomly select one on client mount to avoid hydration mismatch
  const backgroundOptions = [
    '/origami-backgrounds/kg_flower-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1763408223949.html',
    '/origami-backgrounds/kg_flower-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1763408385041.html',
    '/origami-backgrounds/kg_crane-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1763408641201.html',
    '/origami-backgrounds/kg_crane-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1763410156190.html',
  ];
  const [backgroundUrl, setBackgroundUrl] = useState(backgroundOptions[0]); // Default to first option for SSR

  // Randomize background URL on client mount only
  useEffect(() => {
    setBackgroundUrl(backgroundOptions[Math.floor(Math.random() * backgroundOptions.length)]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback timeout to ensure loading overlay always closes (even if iframe fails to load)
  useEffect(() => {
    fallbackTimeout.current = window.setTimeout(() => {
      if (!isBackgroundReady) {
        console.log('Background iframe failed to load within 5s, closing loading overlay');
        setIsBackgroundReady(true);
      }
    }, 5000); // 5 second absolute maximum

    return () => {
      if (fallbackTimeout.current) {
        window.clearTimeout(fallbackTimeout.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for scroll messages from iframe and forward mouse position to iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'scroll') {
        // Forward scroll from iframe to parent page
        window.scrollBy({
          left: event.data.deltaX,
          top: event.data.deltaY,
          behavior: 'instant',
        });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Forward mouse position to iframe
      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: 'mousemove',
            clientX: event.clientX,
            clientY: event.clientY,
          },
          '*'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Update header state when generator visibility or wallet connection changes
  useEffect(() => {
    setShowWalletInHeader(isConnected || (showGenerator && isMintReady));
    setIsInMintView(showGenerator && isMintReady);
  }, [showGenerator, isConnected, setShowWalletInHeader, setIsInMintView, isMintReady]);

  // Auto-redirect only when user connects wallet from this page
  useEffect(() => {
    if (isConnected && connectedAddress && shouldAutoRedirect) {
      setTestAddress(''); // Clear test address when wallet connects
      setIsMintReady(false);
      setShowGenerator(true);
      setShouldAutoRedirect(false); // Reset the flag
    }
  }, [isConnected, connectedAddress, shouldAutoRedirect]);
  
  useEffect(() => {
    return () => {
      if (backgroundReadyTimeout.current) {
        window.clearTimeout(backgroundReadyTimeout.current);
      }
      if (fallbackTimeout.current) {
        window.clearTimeout(fallbackTimeout.current);
      }
    };
  }, []);

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
    setIsMintReady(false);
    setShowGenerator(true);
  };
  
  // Determine which address to use for the generator
  // Priority: connected wallet > test address
  const addressForGenerator = showGenerator ? (connectedAddress || testAddress) : undefined;

  if (showGenerator) {
    return (
      <KatachiGenerator 
        overrideAddress={addressForGenerator as `0x${string}` | undefined} 
        onReady={() => setIsMintReady(true)}
        onGoHome={() => {
          setIsMintReady(false);
          setShowGenerator(false);
        }}
      />
    );
  }

  return (
    <>
      {/* Background iframe - responds to mouse movement but ignores scroll */}
      <iframe
        src={backgroundUrl}
        className="fixed inset-0 w-full h-full border-0 md:pointer-events-auto pointer-events-none"
        style={{ zIndex: 0 }}
        title="Background animation"
        scrolling="no"
        onLoad={() => {
          // Allow iframe internals (three.js + assets) a moment to render before revealing content
          if (backgroundReadyTimeout.current) {
            window.clearTimeout(backgroundReadyTimeout.current);
          }
          backgroundReadyTimeout.current = window.setTimeout(() => setIsBackgroundReady(true), 2400);
        }}
      />

      {/* Dark overlay - pointer-events-none allows mouse to pass through to iframe */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none" style={{ zIndex: 1 }} />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 md:py-12 pointer-events-none" style={{ zIndex: 2 }}>
        {/* Ambient loader while background iframe hydrates */}
        <div
          className={`absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-700 ease-out ${
            isBackgroundReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <FoldLoadingOverlay
            text="Shapeの旅を読み込んでいます..."
            subtext={undefined}
            className="pointer-events-none w-full h-full"
          />
        </div>

        <div
          className={`w-full max-w-4xl space-y-8 md:space-y-12 transition-opacity duration-700 ease-out ${
            isBackgroundReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
        {/* Hero Section */}
        <div
          className={`w-full space-y-4 md:space-y-6 text-center pointer-events-none transition-opacity duration-700 ease-out ${
            isBackgroundReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl font-[family-name:var(--font-montserrat)]">
            Katachi Gen <br />
            <span className="opacity-70 text-3xl sm:text-5xl font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
          </h1>

          {/* Brief Description */}
          <p className="text-white text-2xl md:text-3xl max-w-2xl mx-auto leading-relaxed font-semibold">
            Generative 3D Origami artifacts of your collection on ShapeL2, co-curated by you and AI.
          </p>

          {/* Japanese Etymology - Compact */}
          <div className="max-w-md mx-auto relative">
            <div
              className="absolute inset-0 bg-black/50 blur-3xl -m-8"
              style={{ zIndex: -1 }}
            />
            <div className="text-white/60 text-lg md:text-xl leading-relaxed relative">
              <div className="border-t border-white/30 pb-2 mb-2 md:pb-3 md:mb-3 w-[70%] mx-auto">
              </div>
              <p>
                <strong className="text-white/80">Katachi</strong> <span className="text-white/50">(</span>カタチ<span className="text-white/50">)</span> = Shape/Form<br/>
                <strong className="text-white/80">Gen</strong> <span className="text-white/50">(</span>ゲン<span className="text-white/50">)</span> = To Appear/Manifest<br/>
                カタチ・ゲン = <strong className="animate-gradient-text text-xl md:text-2xl">Shape Revealed</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Two Column CTAs */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Primary CTA - Reveal Your Shape */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-[3px] border-white md:border-[3px] hover:border-blue-600 bg-transparent backdrop-blur-md pointer-events-auto cursor-pointer">
            <CardContent
              className="p-6 md:p-8 pb-5 md:pb-6 flex flex-col"
              onClick={() => {
                if (!isConnected) {
                  // Trigger the connect button click
                  const connectBtn = document.querySelector('[data-reveal-connect-btn]') as HTMLButtonElement;
                  connectBtn?.click();
                } else {
                  setIsMintReady(false);
                  setShowGenerator(true);
                }
              }}
            >
              <div className="flex justify-center">
                <Origami className="h-16 w-16 text-primary" />
              </div>
              <div className="space-y-2 text-center mt-3 md:mt-4 mb-4 md:mb-6">
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
                      className="w-full gap-2 animate-gradient-button transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectClick(openConnectModal);
                      }}
                      data-reveal-connect-btn
                    >
                      <Wallet className="h-5 w-5" />
                      Connect Wallet
                    </Button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 animate-gradient-button cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMintReady(false);
                    setShowGenerator(true);
                  }}
                >
                  Generate Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Secondary CTA - Explore */}
          <Card
            className="group hover:shadow-lg transition-all duration-300 border-[3px] border-white md:border-[3px] hover:border-blue-600 bg-transparent backdrop-blur-md pointer-events-auto cursor-pointer"
            onClick={handleExploreClick}
          >
            <CardContent className="p-6 md:p-8 pb-5 md:pb-6 flex flex-col">
              <div className="flex justify-center">
                <Sparkles className="h-16 w-16 text-white/80" />
              </div>
              <div className="space-y-2 text-center mt-3 md:mt-4 mb-4 md:mb-6">
                <h2 className="text-2xl font-semibold">Explore</h2>
                <p className="text-sm text-white/80">
                  Share your sentiment and curate a collection of Shape artworks. No wallet needed!
                </p>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 group-hover:!bg-blue-600 group-hover:!text-white group-hover:!border-blue-600 hover:!bg-blue-600 hover:!text-white hover:!border-blue-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExploreClick();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Try it out
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
