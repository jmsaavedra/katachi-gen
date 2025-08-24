import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { toast } from 'sonner';

type MintState = 'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error';

type MintOrigamiData = {
  recipientAddress: string;
  svgContent: string;
  name: string;
  description?: string;
};

type PreparedMintData = {
  success: boolean;
  mintData: {
    transaction: {
      to: string;
      data: string;
      value: string;
    };
    metadata: {
      contractAddress: string;
      functionName: string;
      recipientAddress: string;
      tokenURI: string;
      nftMetadata: Record<string, unknown>;
      estimatedGas: string;
      chainId: number;
      explorerUrl: string;
    };
    instructions: {
      nextSteps: string[];
    };
  };
};

// ABI for the safeMintWithURI function
const mintNFTAbi = parseAbi([
  'function safeMintWithURI(address to, uint256 tokenId, string memory uri) public'
]);

export function useMintOrigami() {
  const [state, setState] = useState<MintState>('idle');
  const [preparedData, setPreparedData] = useState<PreparedMintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { address } = useAccount();
  
  const { 
    writeContract, 
    data: transactionHash, 
    isPending: isTransactionPending,
    error: writeError 
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const prepareMint = async (mintData: MintOrigamiData) => {
    try {
      setState('preparing');
      setError(null);
      
      const response = await fetch('/api/mint-origami', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mintData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to prepare mint');
      }

      const result: PreparedMintData = await response.json();
      setPreparedData(result);
      setState('idle');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare mint';
      setError(errorMessage);
      setState('error');
      toast.error(errorMessage);
      throw err;
    }
  };

  const executeMint = async () => {
    if (!preparedData || !address) {
      throw new Error('No prepared mint data or wallet not connected');
    }

    try {
      setState('pending');
      setError(null);

      const { transaction, metadata } = preparedData.mintData;
      
      // Use the prepared transaction data with safeMintWithURI
      writeContract({
        address: transaction.to as `0x${string}`,
        abi: mintNFTAbi,
        functionName: 'safeMintWithURI',
        args: [
          metadata.recipientAddress as `0x${string}`, 
          BigInt(metadata.tokenId), 
          metadata.tokenURI
        ],
      });

      toast.success('Transaction submitted! Please wait for confirmation...');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute mint';
      setError(errorMessage);
      setState('error');
      toast.error(errorMessage);
      throw err;
    }
  };

  // Update state based on transaction status
  if (isTransactionPending && state !== 'pending') {
    setState('pending');
  }

  if (isConfirming && state !== 'confirming') {
    setState('confirming');
    toast.success('Transaction confirmed! Minting your NFT...');
  }

  if (isConfirmed && state !== 'success') {
    setState('success');
    toast.success('NFT minted successfully! 🎉');
  }

  if ((writeError || confirmError) && state !== 'error') {
    const errorMessage = writeError?.message || confirmError?.message || 'Transaction failed';
    setError(errorMessage);
    setState('error');
    toast.error(errorMessage);
  }

  const reset = () => {
    setState('idle');
    setPreparedData(null);
    setError(null);
  };

  return {
    state,
    error,
    preparedData,
    transactionHash,
    isLoading: state === 'preparing' || isTransactionPending || isConfirming,
    isSuccess: state === 'success',
    isError: state === 'error',
    prepareMint,
    executeMint,
    reset,
  };
}