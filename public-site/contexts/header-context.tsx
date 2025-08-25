'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
  showWalletInHeader: boolean;
  setShowWalletInHeader: (show: boolean) => void;
  isInMintView: boolean;
  setIsInMintView: (inView: boolean) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [showWalletInHeader, setShowWalletInHeader] = useState(false);
  const [isInMintView, setIsInMintView] = useState(false);

  return (
    <HeaderContext.Provider value={{ 
      showWalletInHeader, 
      setShowWalletInHeader,
      isInMintView,
      setIsInMintView
    }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}