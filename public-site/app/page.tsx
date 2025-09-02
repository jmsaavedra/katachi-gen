'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { KatachiGenerator } from '@/components/katachi-generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Code, ChevronRight, ChevronLeft, Search } from 'lucide-react';
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

  // Update header state when generator visibility changes
  useEffect(() => {
    setShowWalletInHeader(showGenerator);
    setIsInMintView(showGenerator);
  }, [showGenerator, setShowWalletInHeader, setIsInMintView]);
  
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
    return <KatachiGenerator overrideAddress={addressForGenerator as `0x${string}` | undefined} />;
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
          className="w-full h-auto"
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
          <span className="block sm:inline">Katachi Gen</span>
          <span className="block sm:inline opacity-70"> 形現</span>
        </h1>
        <p className="text-primary/80 text-xl font-light italic uppercase tracking-wider mb-2 md:mb-8">
          Shape Revealed
        </p>
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-muted-foreground text-xl leading-relaxed">
            Katachi Gen creates digital + physical artifacts representing your on-chain journey, in the form of generative 3D origami patterns. Using AI sentiment analysis and art curation, each pattern reflects your personal participation on{' '}
            <a 
              href="https://shape.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              ShapeL2
            </a>
            , creating a one-of-a-kind digital origami that represents a snapshot of your on-chain identity.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="text-center max-w-md mx-auto">
          <p className="text-muted-foreground text-sm italic mb-2">From Japanese</p>
          <p className="text-muted-foreground text-xl leading-relaxed">
            <strong className="text-white">Katachi</strong> (形) = Shape/Form<br/>
            <strong className="text-white">Gen</strong> (現) = To Appear/Manifest<br/>
            形現 = <strong className="text-white">Shape Revealed</strong>
          </p>
        </div><br></br>
        
        <div className="flex justify-center">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button 
                  size="lg"
                  className="gap-3 px-24 py-8 text-xl animate-gradient-button w-full max-w-md"
                  onClick={() => handleConnectClick(openConnectModal)}
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
              Mint Now
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
                  
                  <div className="mt-4 space-y-0">
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
                      className="w-full"
                      variant="outline"
                    >
                      <Search className="h-4 w-4" />
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
          <div className="w-full max-w-[700px]">
            <div className="flex justify-between items-center mb-3">
              {currentIframeIndex > 0 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex - 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
              ) : (
                <div className="w-20"></div>
              )}
              <h3 className="text-sm font-bold uppercase tracking-wider">Katachi Gen Gallery</h3>
              {currentIframeIndex < galleryUrls.length - 1 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex + 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
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
                    width="600"
                    height="600"
                    className="border-0 bg-transparent"
                    title={`Katachi Gen Interactive Demo ${currentIframeIndex + 1}`}
                    allowFullScreen
                  />
                </div>
                <a
                  href={galleryUrls[currentIframeIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm text-primary hover:underline font-medium"
                >
                  View live interactive token →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Show one iframe with pagination */}
        <div className="md:hidden flex flex-col items-center">
          <div className="w-full max-w-[350px]">
            <div className="flex justify-between items-center mb-3 pr-2">
              {currentIframeIndex > 0 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex - 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
              ) : (
                <div className="w-20"></div>
              )}
              <h3 className="text-sm font-bold uppercase tracking-wider">Katachi Gen Gallery</h3>
              {currentIframeIndex < galleryUrls.length - 1 ? (
                <button
                  onClick={() => setCurrentIframeIndex(currentIframeIndex + 1)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="w-20"></div>
              )}
            </div>
            <div className="relative rounded-lg overflow-hidden border bg-card shadow-lg">
              <iframe
                src={galleryUrls[currentIframeIndex]}
                width="350"
                height="350"
                className="border-0 bg-transparent"
                title={`Katachi Gen Interactive Demo ${currentIframeIndex + 1}`}
                allowFullScreen
              />
            </div>
          </div>
          <a
            href={galleryUrls[currentIframeIndex]}
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
    </div>
  );
}
