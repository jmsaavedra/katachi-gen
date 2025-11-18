'use client';

import Image from 'next/image';
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
  const { showWalletInHeader, isInMintView, setIsInMintView, setShowWalletInHeader } = useHeader();

  const handleLogoClick = () => {
    // Reset mint view state and navigate to homepage
    setIsInMintView(false);
    setShowWalletInHeader(false);
    // Force a page refresh to reset all state
    window.location.href = '/';
  };

  return (
    <header className={`fixed left-0 right-0 z-40 ${isInMintView ? 'top-0' : 'top-[40px] md:top-[40px]'} bg-black/60 backdrop-blur-md md:bg-transparent md:backdrop-blur-none ${isInMintView ? 'md:bg-black/60 md:backdrop-blur-md' : ''}`}>
      <div className="container mx-auto grid grid-cols-3 h-16 items-center px-4">
        <div className="flex items-center gap-3">
          <button onClick={handleLogoClick} className="hidden md:flex items-center gap-2 bg-transparent border-none cursor-pointer">
            <span className="text-xl font-bold font-[family-name:var(--font-montserrat)]">Katachi Gen</span>
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="px-3 py-2 h-auto text-sm font-semibold">
                How It Works
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-[1200px] max-h-[90vh] overflow-y-auto w-full pt-10">
              <DialogHeader className="text-center max-w-2xl mx-auto">
                <DialogTitle className="text-4xl font-light">
                  About Katachi Gen
                </DialogTitle>
                <DialogDescription className="text-xl pt-4">
                  カタチ・ゲン - Shape Revealed
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 text-center">
                <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                  <em>Katachi Gen</em> <span className="italic">(&quot;Kah-TAH-chee Gehn&quot;)</span> transforms your on-chain participation into a unique 3D origami pattern through AI sentiment analysis and algorithmic artwork curation.
                </p>
                <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                  Each pattern reflects your personal collecting journey on{' '}
                  <a
                    href="https://shape.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Shape
                  </a>
                  , creating a one-of-a-kind digital origami, which can be downloaded, printed, and folded into an origami form.
                </p>
                <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                  A digital and physical artifact representing a snapshot of your on-chain identity.
                </p>

                <div className="max-w-2xl mx-auto">
                  <div className="border border-primary p-4 rounded-md inline-block">
                    <p className="font-medium text-primary text-lg">
                      🏆{' '}
                      <a
                        href="https://x.com/Shape_L2/status/1962942181271834826"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        First Place
                      </a>
                      {' '}winner,{' '}
                      <a
                        href="https://shape.network/shapecraft"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Shapecraft<sup>2</sup> Hackathon
                      </a>
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">How It Works: Shape to Shape</h3>
                  <div className="space-y-3 text-lg text-muted-foreground text-left">
                    <ol className="list-decimal list-outside space-y-3 ml-8">
                      <li>
                        <span className="font-bold">Share your sentiment</span> about collecting on-chain artwork. Our AI will interpret your thought and curate a selection of artworks from your collection.
                      </li>
                      <li>
                        <span className="font-bold">AI analyzes your collection</span> using Shape MCP data including your Stack rank and NFTs owned to determine fold complexity and pattern selection.
                      </li>
                      <li>
                        <span className="font-bold">Generate your unique origami</span> - A 2D origami pattern (FOLD file) is created, with your curated artworks graphically represented on the surface.
                      </li>
                      <li>
                        <span className="font-bold">Mint and collect</span> your one-of-a-kind digital origami. Download the printable pattern and fold it into a physical artifact representing your on-chain identity.
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">Etymology & Philosophy</h3>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 text-center text-lg">
                      <div className="space-y-2">
                        <p className="font-medium">Katachi <span className="text-gray-500">(</span> 形 <span className="text-gray-500">or</span> カタチ <span className="text-gray-500">)</span></p>
                        <p className="text-muted-foreground">Shape/Form in Japanese</p>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">Gen <span className="text-gray-500">(</span> 現 <span className="text-gray-500">or</span> ゲン <span className="text-gray-500">)</span></p>
                        <p className="text-muted-foreground">To Appear/Manifest</p>
                      </div>
                    </div>
                    <p className="italic text-lg text-center text-muted-foreground">
                      カタチ・ゲン: &ldquo;Shape Revealed&rdquo; or &ldquo;Shape Manifest&rdquo;, evoking the transformation from flat pattern to dimensional object.
                    </p>
                    <p className="text-lg text-muted-foreground">
                      This project interprets data from ShapeL2, generating physical shapes featuring art from the blockchain. We embrace the playful nature of what Katachi Gen artifacts represent, drawing inspiration from traditional origami forms like the Origami Kabuto, commonly folded by Japanese youth.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <Image
                          src="/img/1.png"
                          alt="Origami inspiration and cultural context"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <Image
                          src="/img/2.png"
                          alt="Traditional origami forms and philosophy"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">Technical Foundation</h3>
                  <p className="text-lg text-muted-foreground">
                    Built with and inspired by computational origami research and tools.
                  </p>
                  <ul className="list-disc list-outside space-y-2 ml-8 text-lg text-muted-foreground text-left">
                    <li>
                      <a
                        href="https://www.jst.go.jp/erato/igarashi/publications/001/j15h2mita.pdf"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Jun Mitani&apos;s research
                      </a>
                      {' '}on designing crease patterns for flat-foldable origami with numerical optimization
                    </li>
                    <li>
                      <a
                        href="https://github.com/amandaghassaei/OrigamiSimulator"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Origami Simulator
                      </a>
                      {' '}for 3D visualization and validation by Amanda Ghassaei
                    </li>
                    <li>
                      <a
                        href="https://github.com/rabbit-ear"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Rabbit Ear
                      </a>
                      {' '}computational origami library
                    </li>
                    <li>
                      <a
                        href="https://github.com/shape-network/mcp-server"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Shape MCP Server
                      </a>
                      {' '}for on-chain data integration and AI sentiment analysis and NFT curation
                    </li>
                  </ul>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <Image
                        src="/img/3.png"
                        alt="Technical implementation and computational origami"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <Image
                        src="/img/4.png"
                        alt="Shape MCP integration and data processing"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">Eligibility</h3>
                  <p className="text-lg text-muted-foreground">
                    All wallets with a{' '}
                    <a
                      href="https://stack.shape.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      ShapeL2 Stack NFT
                    </a>
                    {' '}are able to mint Katachi Gen NFTs.
                  </p>
                </div>

                <div className="space-y-4 pt-4 pb-6 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">Team</h3>
                  <div className="flex flex-col md:flex-row gap-4 md:gap-42 justify-center items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        <Image
                          src="/quietloops.jpg"
                          alt="quietloops profile"
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-lg">Joe Saavedra</p>
                        <a
                          href="https://x.com/quietloops"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-lg"
                        >
                          @quietloops
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        <Image
                          src="/sembo.jpg"
                          alt="sembo profile"
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-lg">sembo</p>
                        <a
                          href="https://x.com/1000b"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-lg"
                        >
                          @1000b
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleLogoClick}
            className="text-base font-semibold tracking-wide opacity-80 hover:opacity-100 transition-opacity"
            aria-label="Back to landing"
          >
            カタチ・ゲン
          </button>
        </div>
        <div className="flex justify-end">
          {showWalletInHeader && <WalletConnect />}
        </div>
      </div>
    </header>
  );
}
