'use client';

import { WalletConnect } from '@/components/wallet-connect';
import { useHeader } from '@/contexts/header-context';
import { HowItWorksModal } from '@/components/how-it-works-modal';

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
    <header
      className={`fixed left-0 right-0 z-40 ${
        isInMintView ? 'top-0' : 'top-[40px] md:top-[40px]'
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center md:justify-between">
        {/* Mobile: landing page layout */}
        {!isInMintView ? (
          <div className="flex w-full items-center justify-between md:hidden">
            <button
              onClick={handleLogoClick}
              className="text-base font-semibold tracking-wide opacity-80 hover:opacity-100 transition-opacity"
              aria-label="Back to landing"
            >
              カタチ・ゲン
            </button>
            <HowItWorksModal variant="secondary" size="sm" className="px-3 py-2 h-auto text-sm font-semibold" />
          </div>
        ) : (
          <div className="grid w-full grid-cols-3 items-center md:hidden">
            {/* Mobile: left slot for Connect in mint view */}
            <div className="flex items-center gap-2">
              {showWalletInHeader && <WalletConnect />}
            </div>
            {/* Mobile: centered Japanese label in mint view */}
            <div className="flex justify-center">
              <button
                onClick={handleLogoClick}
                className="text-base font-semibold tracking-wide opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Back to landing"
              >
                カタチ・ゲン
              </button>
            </div>
            {/* Mobile: right slot for How It Works in mint view */}
            <div className="flex justify-end">
              <HowItWorksModal variant="secondary" size="sm" className="px-3 py-2 h-auto text-sm font-semibold" />
            </div>
          </div>
        )}

        {/* Desktop: left slot with logo */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={handleLogoClick} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
            <span className="text-xl font-bold font-[family-name:var(--font-montserrat)]">Katachi Gen</span>
            <span className="text-xl opacity-70 font-bold font-[family-name:var(--font-montserrat)]">カタチ・ゲン</span>
          </button>
        </div>

        {/* Desktop: right slot for How It Works + Connect */}
        <div className="hidden md:flex justify-end items-center gap-3">
          <HowItWorksModal variant="ghost" className="px-4 py-3 rounded-md text-lg font-bold" />
          {showWalletInHeader && <WalletConnect />}
        </div>
      </div>
    </header>
  );
}
