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
  const { showWalletInHeader, setIsInMintView, setShowWalletInHeader } = useHeader();

  const handleLogoClick = () => {
    // Reset mint view state and navigate to homepage
    setIsInMintView(false);
    setShowWalletInHeader(false);
    // Force a page refresh to reset all state
    window.location.href = '/';
  };

  return (
    <header className="fixed top-[72px] left-0 right-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
          <span className="text-xl font-bold font-[family-name:var(--font-montserrat)]">Katachi Gen</span>
          <span className="text-xl opacity-70 font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
        </button>
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="px-6 py-3 rounded-md text-lg font-bold">
                About
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-[1200px] max-h-[90vh] overflow-y-auto w-full">
              <DialogHeader className="text-center max-w-2xl mx-auto">
                <DialogTitle className="text-4xl font-light">
                  About Katachi Gen
                </DialogTitle>
                <DialogDescription className="text-xl pt-4">
                  カタチ・ゲン - Shape Revealed
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 text-center">
                <p className="text-lg leading-relaxed max-w-2xl mx-auto">
                  Katachi Gen <span className="italic">(Kah-TAH-chee Gehn)</span> transforms your on-chain participation into a unique 3D origami pattern through AI sentiment analysis and algorithmic artwork curation. Each pattern reflects your personal collecting journey on{' '}
                  <a
                    href="https://shape.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Shape
                  </a>
                  , creating a one-of-a-kind digital origami, which can be downloaded, printed on paper, and folded into an origami form. A digital and physical artifact representing a snapshot of your on-chain identity.
                </p>

                <div className="max-w-2xl mx-auto">
                  <div className="border-l-4 border-primary pl-6 space-y-2 inline-block text-left">
                    <p className="font-medium text-primary text-lg">
                      🏆 Winner,{' '}
                      <a
                        href="https://x.com/Shape_L2/status/1962942181271834826"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        First Place
                      </a>
                      ,{' '}
                      <a
                        href="https://shape.network/shapecraft"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Shapecraft2 Hackathon
                      </a>
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">How It Works: Shape to Shape</h3>
                  <div className="space-y-3 text-lg text-muted-foreground text-left">
                    <p>
                      A 2D origami pattern (FOLD file) is generated at time of mint. The fold complexity is determined by Shape MCP data about the wallet that is minting the token.
                    </p>
                    <p>
                      Data used to generate fold lines and graphic texture from your sentiment-curated collection:
                    </p>
                    <ul className="list-disc list-outside space-y-2 ml-8">
                      <li>Stack rank</li>
                      <li>Shape NFTs owned</li>
                      <li>AI-interpreted sentiment filter</li>
                    </ul>
                    <p>
                      NFTs owned by your wallet at time of mint (as well as stack achievements) are graphically represented on the 2D asset, which can be printed and folded by you as the collector. All necessary files are included in the token metadata.
                    </p>
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
                    Built using cutting-edge computational origami research and tools:
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
                    All wallets with a Stack NFT are able to mint Katachi Gen NFTs.
                  </p>
                </div>

                <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                  <h3 className="text-2xl font-semibold">Team</h3>
                  <div className="grid md:grid-cols-2 gap-4">
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
                      <div className="space-y-1">
                        <p className="font-medium text-lg">Joe</p>
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
                      <div className="space-y-1">
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
          {showWalletInHeader && <WalletConnect />}
        </div>
      </div>
    </header>
  );
}