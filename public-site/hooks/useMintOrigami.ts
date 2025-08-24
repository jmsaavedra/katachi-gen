import { useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';

type MintState = 'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error';

type MintOrigamiData = {
  recipientAddress: string;
  svgContent: string;
  name: string;
  description?: string;
  // Add fields for pattern regeneration with correct numbering
  nftCount?: number;
  collections?: number;
  sentimentFilter?: string;
  stackMedalsCount?: number;
  curatedNfts?: Array<{
    name: string;
    description: string;
    image: string;
    contractAddress: string;
    tokenId: string;
  }>;
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
      tokenId: string;
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


export function useMintOrigami() {
  const [state, setState] = useState<MintState>('idle');
  const [preparedData, setPreparedData] = useState<PreparedMintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { address } = useAccount();
  
  const { 
    sendTransaction, 
    data: transactionHash, 
    isPending: isTransactionPending,
    error: writeError 
  } = useSendTransaction();
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const prepareMint = async (mintData: MintOrigamiData) => {
    try {
      console.log('prepareMint: Starting...');
      setState('preparing');
      setError(null);
      
      console.log('prepareMint: Calling API with:', {
        recipientAddress: mintData.recipientAddress,
        hasStackMedalsCount: mintData.stackMedalsCount !== undefined,
        hasSentimentFilter: !!mintData.sentimentFilter,
        curatedNftsCount: mintData.curatedNfts?.length || 0
      });
      
      const response = await fetch('/api/mint-origami', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mintData),
      });

      console.log('prepareMint: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('prepareMint: API error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to prepare mint');
      }

      const result: PreparedMintData = await response.json();
      console.log('prepareMint: API result:', {
        success: result.success,
        hasTokenId: !!result.mintData?.metadata?.tokenId,
        contractAddress: result.mintData?.metadata?.contractAddress
      });
      
      setPreparedData(result);
      setState('idle');
      
      console.log('prepareMint: Completed successfully');
      return result;
    } catch (err) {
      console.error('prepareMint: Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare mint';
      setError(errorMessage);
      setState('error');
      toast.error(errorMessage);
      throw err;
    }
  };

  const executeMint = async (dataOverride?: PreparedMintData) => {
    const dataToUse = dataOverride || preparedData;
    
    console.log('executeMint: Starting...', {
      hasPreparedData: !!preparedData,
      hasDataOverride: !!dataOverride,
      hasAddress: !!address,
      dataToUseSuccess: dataToUse?.success,
    });
    
    if (!dataToUse || !address) {
      console.error('executeMint: Missing data:', {
        preparedData: preparedData ? 'exists' : 'null',
        dataOverride: dataOverride ? 'exists' : 'null',
        address: address ? 'exists' : 'null'
      });
      throw new Error('No prepared mint data or wallet not connected');
    }

    try {
      setState('pending');
      setError(null);

      const { transaction, metadata } = dataToUse.mintData;
      
      console.log('executeMint: Calling sendTransaction with:', {
        contractAddress: transaction.to,
        tokenId: metadata.tokenId,
        recipient: metadata.recipientAddress,
        chainId: metadata.chainId,
        data: transaction.data?.substring(0, 10) + '...' // Log first 10 chars of data
      });
      
      // Use the prepared transaction data directly from MCP server
      sendTransaction({
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
        value: BigInt(transaction.value || '0'),
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
    console.log('Transaction confirmed!', { 
      transactionHash, 
      isConfirmed, 
      receipt: 'Transaction receipt received' 
    });
    setState('success');
    
    // Simple success toast - the UI has the proper buttons with links
    toast.success('NFT minted successfully! 🎉', { duration: 5000 });
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