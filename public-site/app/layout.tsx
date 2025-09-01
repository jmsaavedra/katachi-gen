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
  metadataBase: new URL('https://katachi-gen.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://katachi-gen.vercel.app',
    title: 'Katachi Gen - Shape Revealed',
    description:
      'An NFT collection of algorithmically generated 3D Origami forms representing your on-chain journey on Shape.',
    siteName: 'Katachi Gen',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Katachi Gen - Shape Revealed',
    description:
      'Transform your on-chain journey into unique origami NFTs. A Shapecraft2 Hackathon submission.',
    site: '@Shape_L2',
    creator: '@1000b',
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <HeaderProvider>
            <div className="bg-background min-h-screen font-[family-name:var(--font-geist-sans)]">
              {/* Testnet Header */}
              {process.env.NEXT_PUBLIC_MINT_CHAIN_ID === '11011' && (
                <div className="bg-blue-600 text-white text-center text-xs font-medium h-5 flex items-center justify-center">
                  Currently Minting on Shape Sepolia Testnet
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
                      href="https://x.com/1000b"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Sembo
                    </Link>
                    {' '}and{' '}
                    <Link
                      href="https://x.com/quietloops"
                      target="_blank"
                      rel="noreferrer"
                    >
                      quietloops
                    </Link>
                    . Built on{' '}
                    <Link
                      href="https://shape.network"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Shape
                    </Link>
                    .
                  </div>
                  <div className="text-xs space-x-4">
                    <span>
                      Contract:{' '}
                      <Link
                        href="https://shapescan.xyz/address/0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57"
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono hover:underline"
                      >
                        0xE5CEc1C6a8f0fB8d85E41Eb6013477f7e1440f57
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
