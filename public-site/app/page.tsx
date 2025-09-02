'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Code, ChevronRight, ChevronLeft, Search, ExternalLink } from 'lucide-react';
import { useHeader } from '@/contexts/header-context';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { setShowWalletInHeader, setIsInMintView } = useHeader();
  const [showGenerator, setShowGenerator] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testAddressError, setTestAddressError] = useState('');
  const [currentIframeIndex, setCurrentIframeIndex] = useState(0);
  const [shouldAutoRedirect, setShouldAutoRedirect] = useState(false);
  
  // Gallery URLs
  const galleryUrls = [
    "https://storage.katachi-gen.com/kg_flower-0xee49f82e58a1c2b306720d0c68047cbf70c11fb5-1756775591427.html",
    "https://storage.katachi-gen.com/katachi_1756739536308.html",
    "https://storage.katachi-gen.com/katachi_1756739728214.html",
    "https://storage.katachi-gen.com/katachi_1756737150668.html",
    "https://storage.katachi-gen.com/katachi_1756739206552.html"
  ];
  
  // Check if test mode is enabled via environment variable
  const isTestModeEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true';
  
  // Debug logging
  console.log('NEXT_PUBLIC_ENABLE_TEST_MODE:', process.env.NEXT_PUBLIC_ENABLE_TEST_MODE);
  console.log('isTestModeEnabled:', isTestModeEnabled);

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
  
  const handleMintClick = () => {
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
    <div>
      {/* Video Banner - Break out of container for full width on mobile */}
      <div className="md:hidden -mx-4 -mt-8">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-[115px] object-cover"
        >
          <source src="/homepage-banner-opti.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Video Banner - Desktop version */}
      <div className="hidden md:block w-full max-w-6xl mx-auto mb-6">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-auto rounded-lg"
        >
          <source src="/homepage-banner-opti.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Content section */}
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center space-y-8 px-4 pt-8 md:pt-0">
      
      <div className="space-y-6 text-center max-w-3xl">
        <h1 className="text-5xl font-light tracking-tight sm:text-7xl">
          Katachi Gen <br />
          <span className="opacity-70 text-3xl sm:text-5xl">カタチ・ゲン</span>
        </h1>
        <p className="text-primary/80 text-xl font-light italic uppercase tracking-wider mb-8">
          Shape Revealed
        </p>
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-white text-lg md:text-xl leading-relaxed text-left md:text-center">
            Katachi Gen is a collection of digital + physical artifacts representing your on-chain journey, in the form of generative 3D origami patterns. Using AI sentiment analysis and art curation, each pattern reflects your personal participation on{' '}
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
        </div>
      </div>

      <div className="mt-2 space-y-7">
        <div className="text-center max-w-md mx-auto">
          <p className="text-muted-foreground text-sm italic mb-2">From Japanese</p>
          <p className="text-muted-foreground text-base md:text-xl leading-relaxed">
            <strong className="text-white">Katachi</strong> <span className="text-gray-500">( </span>形 <span className="text-gray-500">or</span> カタチ<span className="text-gray-500"> )</span> = Shape/Form<br/>
            <strong className="text-white">Gen</strong> <span className="text-gray-500">( </span>現 <span className="text-gray-500">or</span> ゲン<span className="text-gray-500"> )</span> = To Appear/Manifest<br/>
            形現 = <strong className="text-white">Shape Revealed</strong>
          </p>
        </div><br></br>
        
        <div className="flex justify-center">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button 
                  size="lg"
                  className="gap-3 px-12 sm:px-24 py-10 animate-gradient-button w-full max-w-md flex flex-col items-center gap-0"
                  onClick={() => handleConnectClick(openConnectModal)}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-12 w-12" />
                    <span className="text-2xl">Reveal Your Shape</span>
                  </div>
                  <span className="text-sm opacity-75">Connect Wallet</span>
                </Button>
              )}
            </ConnectButton.Custom>
          ) : (
            <Button 
              size="lg" 
              className="gap-3 px-12 sm:px-24 py-8 text-xl animate-gradient-button w-full max-w-md"
              onClick={handleMintClick}
            >
              <Sparkles className="h-6 w-6" />
              Reveal Your Shape
            </Button>
          )}
        </div>
        
        {/* Test Mode */}
        {isTestModeEnabled && (
          <Card className="w-full max-w-md mx-auto mt-10 border-dashed border-white/20 bg-muted/30">
            <CardContent className="pt-0 pb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Code className="h-4 w-4" />
                  Try in Explore Mode
                </div>
                <p className="text-xs text-muted-foreground/80">
                  Test with any address (bypass wallet connection)
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
                  
                  <div className="mt-6 space-y-0">
                    <p className="text-xs text-muted-foreground/80 text-center mb-2">
                      Or, explore a random top collector wallet:
                    </p>
                    <Button
                      size="lg"
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
                      className="w-full group border-2 border-blue-50 active:border-blue-100 hover:border-blue-100 active:scale-[1.05] hover:scale-[1.05] text-blue-200 active:text-blue-300 hover:text-blue-300 transition-all duration-300"
                      style={{
                        animation: 'glow 2.5s ease-in-out infinite',
                      }}
                      variant="outline"
                    >
                      <Search className="h-4 w-4 transition-colors" />
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
        {/* Desktop: Show single iframe with navigation */}
        <div className="hidden md:flex flex-col items-center">
          <div className="w-full max-w-[800px]">
            <div className="flex justify-between items-center mb-3">
              {currentIframeIndex > 0 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex - 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
              ) : (
                <div className="w-20"></div>
              )}
              <h3 className="text-sm font-bold uppercase tracking-wider">Interactive Gallery</h3>
              {currentIframeIndex < galleryUrls.length - 1 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex + 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="w-20"></div>
              )}
            </div>
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <div className="relative rounded-lg overflow-hidden border bg-card shadow-lg">
                  <iframe
                    src={galleryUrls[currentIframeIndex]}
                    width="700"
                    height="700"
                    className="border-0 bg-transparent"
                    title={`Katachi Gen Interactive Demo ${currentIframeIndex + 1}`}
                    allowFullScreen
                  />
                </div>
                <div className="w-[700px] flex justify-end mt-4">
                  <a
                    href={galleryUrls[currentIframeIndex]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                  >
                    Open in new tab
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Show one iframe with pagination */}
        <div className="md:hidden flex flex-col items-center">
          <div className="w-screen max-w-none">
            <div className="flex justify-between items-center mb-3 px-4">
              {currentIframeIndex > 0 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex - 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
              ) : (
                <div className="w-20"></div>
              )}
              <h3 className="text-sm font-bold uppercase tracking-wider">Interactive Gallery</h3>
              {currentIframeIndex < galleryUrls.length - 1 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex + 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="w-20"></div>
              )}
            </div>
            <div className="relative w-full aspect-square overflow-hidden border-y bg-card shadow-lg">
              <iframe
                src={galleryUrls[currentIframeIndex]}
                className="w-full h-full border-0 bg-transparent"
                style={{ width: '100%', height: '100%' }}
                title={`Katachi Gen Interactive Demo ${currentIframeIndex + 1}`}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground text-sm">
          🏆 Shapecraft2 Hackathon Submission
        </p>
      </div>
      </div>
    </div>
  );
}
