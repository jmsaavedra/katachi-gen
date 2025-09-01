'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/wallet-connect';
import { useHeader } from '@/contexts/header-context';

export function HeaderWrapper() {
  const { showWalletInHeader } = useHeader();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-light">Katachi Gen</span>
          <span className="text-xl opacity-70">形現</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/about" 
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            About
          </Link>
          {showWalletInHeader && <WalletConnect />}
        </div>
      </div>
    </header>
  );
}