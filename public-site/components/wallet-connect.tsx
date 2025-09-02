'use client';

import { Button } from '@/components/ui/button';
import { abbreviateHash } from '@/lib/utils';
import { ExitIcon } from '@radix-ui/react-icons';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect, useEnsName } from 'wagmi';
import { useHeader } from '@/contexts/header-context';
import { useRouter } from 'next/navigation';

export const WalletConnect = () => {
  const { address } = useAccount();
  // ENS name resolution
  const { data: ensName } = useEnsName({ 
    address,
    chainId: 1, // Mainnet for ENS resolution
  });
  const { disconnect } = useDisconnect();
  const { isInMintView, setIsInMintView, setShowWalletInHeader } = useHeader();
  const router = useRouter();

  function handleDisconnect() {
    disconnect();
    
    // If we're in the mint view, redirect to homepage
    if (isInMintView) {
      setIsInMintView(false);
      setShowWalletInHeader(false);
      router.push('/');
      // Force a page reload to reset the state completely
      window.location.href = '/';
    }
  }

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, account }) =>
        account && address ? (
          <span className="flex items-center gap-x-2 font-medium">
            <span className="hidden md:block">{ensName ?? abbreviateHash(address)}</span>

            <button onClick={handleDisconnect} type="button" className="cursor-pointer">
              <ExitIcon className="size-4" />
            </button>
          </span>
        ) : (
          <Button 
            onClick={openConnectModal} 
            className="animate-gradient-button"
          >
            <span className="md:hidden">Connect</span>
            <span className="hidden md:inline">Connect Wallet</span>
          </Button>
        )
      }
    </ConnectButton.Custom>
  );
};
