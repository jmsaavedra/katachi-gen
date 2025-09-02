import { Providers } from '@/components/providers';
import { HeaderWrapper } from '@/components/header-wrapper';
import { HeaderProvider } from '@/contexts/header-context';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Github } from 'lucide-react';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Katachi Gen - Shape Revealed',
    template: '%s | Katachi Gen',
  },
  description:
    'An NFT collection of algorithmically generated 3D Origami forms representing your on-chain journey on Shape. Transform your wallet data into unique, foldable origami patterns.',
  keywords: [
    'katachi gen',
    'origami nft',
    'shape network',
    'shapecraft2',
    'generative art',
    'web3',
    'blockchain',
    'nft collection',
    'algorithmic art',
    'fold patterns',
    'japanese art',
    'hackathon',
  ],
  authors: [
    { name: 'quietloops', url: 'https://x.com/quietloops' },
    { name: 'sembo', url: 'https://x.com/1000b' },
  ],
  creator: 'quietloops & sembo',
  publisher: 'Katachi Gen',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://katachi-gen.com'),
  alternates: {
    canonical: '/',
  },
  category: 'Generative Art',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://katachi-gen.com',
    title: 'Katachi Gen 形現 - Shape Revealed',
    description:
      'Collection of algorithmically generated 3D Origami forms representing your on-chain journey on Shape.',
    siteName: 'Katachi Gen 形現',
    images: [
      {
        url: '/kg-metaog.jpg',
        width: 1200,
        height: 630,
        alt: 'Katachi Gen 形現 - Generative Origami representing your Shape L2 journey.',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Katachi Gen 形現 - Shape Revealed',
    description:
      'Generative Origami representing your Shape L2 journey.',
    site: '@Shape_L2',
    creator: '@quietloops',
    images: ['/kg-metaog.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      '/favicon.ico'
    ],
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'theme-color': '#000000',
    'color-scheme': 'dark light',
    'twitter:image': 'https://katachi-gen.com/kg-metaog.jpg',
    'twitter:image:alt': 'Katachi Gen 形現 - Generative Origami',
    'og:image:width': '1200',
    'og:image:height': '630',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Katachi Gen 形現",
    "alternateName": "Shape Revealed",
    "url": "https://katachi-gen.com",
    "description": "A collection of algorithmically generated 3D Origami forms representing your on-chain journey on Shape L2.",
    "creator": [
      {
        "@type": "Person", 
        "name": "quietloops",
        "url": "https://x.com/quietloops"
      },
      {
        "@type": "Person",
        "name": "sembo",
        "url": "https://x.com/1000b"
      }
    ],
    "inLanguage": "en-US",
    "about": {
      "@type": "Thing",
      "name": "NFT Collection",
      "description": "Generative origami art based on blockchain data"
    },
    "genre": ["NFT", "Generative Art", "Origami", "Blockchain"],
    "keywords": "katachi gen, origami nft, shape network, generative art, web3, blockchain"
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <HeaderProvider>
            <div className="bg-background min-h-screen font-[family-name:var(--font-geist-sans)]">
              {/* Testnet Header */}
              {process.env.NEXT_PUBLIC_MINT_CHAIN_ID === '11011' && (
                <div className="bg-blue-600 text-white text-center text-xs font-medium h-5 flex items-center justify-center">
                  Currently Minting on Shape Sepolia. Mainnet soon 🚀
                </div>
              )}
              
              <HeaderWrapper />

              <main className="container mx-auto px-4 py-8">{children}</main>

            <footer className="border-t py-6">
              <div className="container mx-auto px-4">
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <div>
                    Made with 🤍 by{' '}
                    <Link
                      href="https://x.com/quietloops"
                      target="_blank"
                      rel="noreferrer"
                    >
                      quietloops
                    </Link>
                    {' '}and{' '}
                    <Link
                      href="https://x.com/1000b"
                      target="_blank"
                      rel="noreferrer"
                    >
                      sembo
                    </Link>
                    .
                  </div>
                  <div className="text-xs">
                    <span>
                      Contract:{' '}
                      <Link
                        href="https://shapescan.xyz/address/0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57?tab=contract"
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono hover:underline"
                      >
                        <span className="md:hidden">0xE5CE...0f57</span>
                        <span className="hidden md:inline">0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57</span>
                      </Link>
                    </span>
                  </div>
                  <div className="text-xs flex justify-center items-center space-x-4">
                    <span>
                      Built on{' '}
                      <Link
                        href="https://shape.network"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Shape
                      </Link>
                    </span>
                    <span>
                      <Link
                        href="https://github.com/jmsaavedra/katachi-gen"
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        <Github className="h-3 w-3" />
                        View on GitHub
                      </Link>
                    </span>
                  </div>
                </div>
              </div>
            </footer>
            </div>
          </HeaderProvider>
        </Providers>
      </body>
    </html>
  );
}
