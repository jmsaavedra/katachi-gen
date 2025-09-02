'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/wallet-connect';
import { useHeader } from '@/contexts/header-context';
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
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
          <span className="text-xl font-light">Katachi Gen</span>
          <span className="text-xl opacity-70">形現</span>
        </button>
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