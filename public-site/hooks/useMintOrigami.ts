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
    image: string;
    contractAddress: string;
    tokenId: string;
  }>;
  // Arweave data from generate-katachi API
  arweaveData?: {
    thumbnailId: string;
    htmlId: string;
    thumbnailUrl: string;
    htmlUrl: string;
    metadata?: {
      name: string;
      description: string;
      attributes: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
  };
};

type PreparedMintData = {
  success: boolean;
  mintData: {
    transaction: {
      to: string;
      data: string;
      value: string;
    };
    paymentTransaction?: {
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
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('prepareMint: Failed to parse error response:', parseError);
          throw new Error(`API request failed with status ${response.status}`);
        }
        console.log('prepareMint: API error:', errorData);
        
        const errorMessage = (
          (typeof errorData?.details === 'string' ? errorData.details : '') ||
          (typeof errorData?.error === 'string' ? errorData.error : '') ||
          'Failed to prepare mint'
        );
        throw new Error(errorMessage);
      }

      let result: PreparedMintData;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('prepareMint: Failed to parse success response:', parseError);
        throw new Error('Failed to parse mint preparation response');
      }
      
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
    
    console.log('🚀 [EXECUTE_MINT] Starting execution...', {
      hasPreparedData: !!preparedData,
      hasDataOverride: !!dataOverride,
      hasAddress: !!address,
      dataToUseSuccess: dataToUse?.success,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
    
    if (!dataToUse || !address) {
      console.error('❌ [EXECUTE_MINT] Missing required data:', {
        preparedData: preparedData ? 'exists' : 'null',
        dataOverride: dataOverride ? 'exists' : 'null',
        address: address ? 'exists' : 'null',
        dataToUse: dataToUse ? 'exists' : 'null',
      });
      throw new Error('No prepared mint data or wallet not connected');
    }

    try {
      setState('pending');
      setError(null);

      // Log the entire data structure for debugging
      console.log('📊 [EXECUTE_MINT] Full dataToUse structure:', {
        hasSuccess: 'success' in dataToUse,
        hasMintData: 'mintData' in dataToUse,
        topLevelKeys: Object.keys(dataToUse),
        mintDataKeys: dataToUse.mintData ? Object.keys(dataToUse.mintData) : 'N/A',
      });
      
      // Also log stringified version for complete visibility
      console.log('📄 [EXECUTE_MINT] Stringified dataToUse:', JSON.stringify(dataToUse, null, 2));
      
      const { transaction, paymentTransaction, metadata } = dataToUse.mintData;
      
      // Extensive validation logging
      // Check if we have a payment transaction
      if (paymentTransaction) {
        console.log('💰 [EXECUTE_MINT] Processing payment transaction first:', {
          paymentTo: paymentTransaction.to,
          paymentValue: paymentTransaction.value,
          hasPaymentData: !!paymentTransaction.data,
        });

        // Execute payment transaction first
        setState('confirming');
        try {
          console.log('💰 [EXECUTE_MINT] Sending payment transaction...');
          await sendTransaction({
            to: paymentTransaction.to as `0x${string}`,
            data: paymentTransaction.data as `0x${string}`,
            value: BigInt(paymentTransaction.value),
          });
          
          // Wait for payment confirmation
          // Note: This is simplified - in production you might want to wait for confirmation
          console.log('💰 [EXECUTE_MINT] Payment sent, proceeding with mint...');
        } catch (error) {
          console.error('❌ [EXECUTE_MINT] Payment failed:', error);
          setState('error');
          setError('Payment transaction failed');
          toast.error('Payment transaction failed');
          return;
        }
      }

      console.log('🔍 [EXECUTE_MINT] Transaction validation:', {
        hasTransaction: !!transaction,
        transactionType: typeof transaction,
        transactionKeys: transaction ? Object.keys(transaction) : [],
        hasTo: !!transaction?.to,
        toValue: transaction?.to,
        hasData: !!transaction?.data,
        dataLength: transaction?.data?.length,
        dataPrefix: transaction?.data?.substring(0, 10),
        hasValue: !!transaction?.value,
        valueRaw: transaction?.value,
      });
      
      console.log('🔍 [EXECUTE_MINT] Metadata validation:', {
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
        contractAddress: metadata?.contractAddress,
        tokenId: metadata?.tokenId,
        recipientAddress: metadata?.recipientAddress,
        chainId: metadata?.chainId,
      });
      
      if (!transaction || !transaction.data) {
        console.error('❌ [EXECUTE_MINT] Invalid transaction object:', {
          transaction: transaction || 'undefined',
          hasTransaction: !!transaction,
          hasData: !!transaction?.data,
          transactionKeys: transaction ? Object.keys(transaction) : [],
          rawTransaction: JSON.stringify(transaction),
        });
        throw new Error('Invalid transaction data from server');
      }
      
      // Validate hex format
      const isValidHex = transaction.data && 
                        typeof transaction.data === 'string' && 
                        transaction.data.startsWith('0x');
      
      console.log('✅ [EXECUTE_MINT] Hex validation:', {
        isValidHex,
        dataType: typeof transaction.data,
        dataStartsWith0x: transaction.data?.startsWith('0x'),
        first50Chars: transaction.data?.substring(0, 50),
      });
      
      if (!isValidHex) {
        console.error('❌ [EXECUTE_MINT] Invalid hex format:', {
          data: transaction.data,
          type: typeof transaction.data,
          startsWith0x: transaction.data?.startsWith('0x'),
        });
        throw new Error('Invalid transaction data format - not a valid hex string');
      }
      
      // Prepare transaction parameters
      const txParams: any = {
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
      };
      
      // Handle value field
      if (transaction.value && transaction.value !== '0x0' && transaction.value !== '0') {
        console.log('💰 [EXECUTE_MINT] Adding value to transaction:', {
          rawValue: transaction.value,
          parsedValue: BigInt(transaction.value).toString(),
        });
        txParams.value = BigInt(transaction.value);
      } else {
        console.log('💰 [EXECUTE_MINT] No value needed for transaction (free mint)');
      }
      
      console.log('📤 [EXECUTE_MINT] Final transaction parameters:', {
        to: txParams.to,
        dataLength: txParams.data?.length,
        dataPrefix: txParams.data?.substring(0, 10),
        hasValue: 'value' in txParams,
        value: txParams.value?.toString(),
        fullParams: JSON.stringify(txParams),
      });
      
      console.log('🔗 [EXECUTE_MINT] Calling sendTransaction with wagmi...');
      
      try {
        const result = sendTransaction(txParams);
        console.log('✅ [EXECUTE_MINT] sendTransaction called successfully:', {
          result,
          resultType: typeof result,
        });
      } catch (sendError) {
        console.error('❌ [EXECUTE_MINT] sendTransaction threw error:', {
          error: sendError,
          message: sendError instanceof Error ? sendError.message : 'Unknown error',
          stack: sendError instanceof Error ? sendError.stack : undefined,
        });
        throw sendError;
      }

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