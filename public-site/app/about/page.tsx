import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Katachi Gen - transforming NFT collections into unique 3D origami patterns through AI sentiment analysis and algorithmic curation on Shape network.',
  openGraph: {
    title: 'About Katachi Gen - Shape Revealed',
    description: 'Learn about Katachi Gen - transforming NFT collections into unique 3D origami patterns through AI sentiment analysis and algorithmic curation on Shape network.',
    images: ['/kg-metaog.jpg'],
  },
  twitter: {
    title: 'About Katachi Gen - Shape Revealed',
    description: 'Learn about Katachi Gen - transforming NFT collections into unique 3D origami patterns through AI sentiment analysis and algorithmic curation on Shape network.',
    images: ['/kg-metaog.jpg'],
  },
};

export default function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light tracking-tight">
            About Katachi Gen
          </h1>
          <div className="text-xl opacity-70">
            形現 - Shape Revealed
          </div>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <div className="bg-muted/30 rounded-lg p-8 space-y-8">
            <p className="text-lg leading-relaxed">
              Katachi Gen transforms your NFT collection into unique 3D origami patterns through AI sentiment analysis and algorithmic curation. Each pattern reflects your personal collecting journey on ShapeL2, creating a one-of-a-kind digital origami, which can be printed and folded. A digital and physical artifact representing a snapshot of your on-chain identity.
            </p>

            <div className="border-l-4 border-primary pl-6 space-y-2">
              <p className="font-medium text-primary">
                🏆{' '}
                <Link
                  href="https://shape.network/shapecraft"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Shapecraft2
                </Link>
                {' '}Hackathon Submission
              </p>
            </div>

            <div className="space-y-6 mt-12">
              <h2 className="text-2xl font-light">How It Works: Shape to Shape</h2>
              <div className="space-y-4 text-base">
                <p>
                  A 2D origami pattern (FOLD file) is generated at time of mint. The fold complexity is determined by Shape MCP data about the wallet that is minting the token.
                </p>
                <p>
                  Data used to generate fold lines and graphic texture from your sentiment-curated collection:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Stack rank</li>
                  <li>Shape NFTs owned</li>
                  <li>AI-interpreted sentiment filter</li>
                </ul>
                <p>
                  NFTs owned by your wallet at time of mint (as well as stack achievements) are graphically represented on the 2D asset, which can be printed and folded by you as the collector. All necessary files are included in the token metadata.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-light">Etymology & Philosophy</h2>
              <div className="px-12 md:px-24 space-y-6">
                <div className="grid md:grid-cols-2 gap-4 text-center">
                  <div className="space-y-2">
                    <p className="font-medium text-lg">Katachi (形)</p>
                    <p className="text-muted-foreground">Shape/Form in Japanese</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">Gen (現)</p>
                    <p className="text-muted-foreground">To Appear/Manifest</p>
                  </div>
                </div>
                <p className="italic text-base text-center">
                  Together: &ldquo;Shape Revealed&rdquo; or &ldquo;Shape Manifest&rdquo;, evoking the transformation from flat pattern to dimensional object.
                </p>
              </div>
              <p className="text-base">
                This project interprets data from ShapeL2, generating physical shapes featuring art from the blockchain. We embrace the playful nature of what Katachi Gen artifacts represent, drawing inspiration from traditional origami forms like the Origami Kabuto, commonly folded by Japanese youth.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
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

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-light">Technical Foundation</h2>
              <p className="text-base">
                Built using cutting-edge computational origami research and tools:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>
                  <Link
                    href="https://www.jst.go.jp/erato/igarashi/publications/001/j15h2mita.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Jun Mitani&apos;s research
                  </Link>
                  {' '}on designing crease patterns for flat-foldable origami with numerical optimization
                </li>
                <li>
                  <Link
                    href="https://github.com/amandaghassaei/OrigamiSimulator"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Origami Simulator
                  </Link>
                  {' '}for 3D visualization and validation
                </li>
                <li>
                  <Link
                    href="https://github.com/rabbit-ear"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Rabbit Ear
                  </Link>
                  {' '}computational origami library
                </li>
                <li>
                  <Link
                    href="https://github.com/shape-network/mcp-server"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Shape MCP Server
                  </Link>
                  {' '}for on-chain data integration and AI sentiment analysis and NFT curation
                </li>
              </ul>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
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

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-light">Eligibility</h2>
              <p className="text-base">
                All wallets with a Stack NFT are able to mint Katachi Gen NFTs.
              </p>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-light">Team</h2>
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
                    <p className="font-medium">Joe</p>
                    <Link
                      href="https://x.com/quietloops"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                    >
                      @quietloops
                    </Link>
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
                    <p className="font-medium">sembo</p>
                    <Link
                      href="https://x.com/1000b"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                    >
                      @1000b
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}