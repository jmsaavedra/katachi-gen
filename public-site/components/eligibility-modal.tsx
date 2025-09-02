'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'no-nfts' | 'no-stack';
  onGoHome?: () => void;
}

export function EligibilityModal({ isOpen, onClose, reason, onGoHome }: EligibilityModalProps) {
  const router = useRouter();

  const handleClose = () => {
    onClose();
    if (onGoHome) {
      onGoHome(); // Use callback to reset generator state
    } else {
      router.push('/'); // Fallback to navigation
    }
  };
  if (reason === 'no-nfts') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              NFTs Required
            </DialogTitle>
            <DialogDescription className="pt-3">
              You need at least 1 NFT on Shape to generate a Katachi Gen.
            </DialogDescription>
            <div className="pt-4 space-y-3">
              <div className="flex flex-col gap-3">
                <Button asChild className="w-full">
                  <a 
                    href="https://stack.shape.network/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    Go start collecting!
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Shape Stack Required
          </DialogTitle>
          <DialogDescription className="pt-3">
            Sorry you need to{' '}
            <a 
              href="https://stack.shape.network/quietloops?ref=rfhkmnb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Mint Your Stack
            </a>
            {' '}to generate a Katachi Gen!
          </DialogDescription>
          <div className="pt-4 space-y-3">
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <a 
                  href="https://stack.shape.network/quietloops?ref=rfhkmnb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2"
                >
                  Mint Your Stack
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}