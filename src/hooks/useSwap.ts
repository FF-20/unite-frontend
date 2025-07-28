// hooks/useSwap.ts
import { useState, useCallback } from 'react';
import { CrossChainSwapManager } from '@/lib/swap-manager';
import { WalletUtils, type WalletConnection } from '@/lib/wallet-utils';
import { SEPOLIA_CONTRACTS } from '@/lib/constants';
import { type QuoteParams, type SwapResult, type Quote } from '@/lib/types';

interface SwapState {
  isConnected: boolean;
  address: string;
  isLoading: boolean;
  error: string | null;
  swapResult: SwapResult | null;
  quote: Quote | null;
}

interface SwapParams {
  srcAmount: string;
  srcToken: string;
  dstToken: string;
  preset: 'fast' | 'medium' | 'slow';
}

export function useSwap() {
  const [state, setState] = useState<SwapState>({
    isConnected: false,
    address: '',
    isLoading: false,
    error: null,
    swapResult: null,
    quote: null
  });

  const [walletConnection, setWalletConnection] = useState<WalletConnection | null>(null);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const connection = await WalletUtils.connectWallet();
      
      // Check if on correct chain (Sepolia)
      if (connection.chainId !== 11155111) {
        await WalletUtils.switchChain(11155111);
      }
      
      setWalletConnection(connection);
      setState(prev => ({
        ...prev,
        isConnected: true,
        address: connection.address,
        isLoading: false
      }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      }));
    }
  }, []);

  // Check existing connection
  const checkConnection = useCallback(async () => {
    const connection = await WalletUtils.checkConnection();
    if (connection) {
      setWalletConnection(connection);
      setState(prev => ({
        ...prev,
        isConnected: true,
        address: connection.address
      }));
    }
  }, []);

  // Get quote
  const getQuote = useCallback(async (params: SwapParams): Promise<Quote | null> => {
    if (!walletConnection) {
      throw new Error('Wallet not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const swapManager = new CrossChainSwapManager(
        walletConnection.provider,
        walletConnection.signer,
        SEPOLIA_CONTRACTS,
        walletConnection.chainId
      );

      const quoteParams: QuoteParams = {
        amount: params.srcAmount,
        srcChainId: walletConnection.chainId,
        dstChainId: walletConnection.chainId, // Same chain for testing
        srcTokenAddress: params.srcToken,
        dstTokenAddress: params.dstToken,
        walletAddress: walletConnection.address,
        enableEstimate: true
      };

      const quote = await swapManager.getQuote(quoteParams);
      
      setState(prev => ({ 
        ...prev, 
        quote, 
        isLoading: false 
      }));

      return quote;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get quote'
      }));
      return null;
    }
  }, [walletConnection]);

  // Execute swap
  const executeSwap = useCallback(async (params: SwapParams): Promise<SwapResult | null> => {
    if (!walletConnection) {
      throw new Error('Wallet not connected');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const swapManager = new CrossChainSwapManager(
        walletConnection.provider,
        walletConnection.signer,
        SEPOLIA_CONTRACTS,
        walletConnection.chainId
      );

      // Get quote first
      const quoteParams: QuoteParams = {
        amount: params.srcAmount,
        srcChainId: walletConnection.chainId,
        dstChainId: walletConnection.chainId,
        srcTokenAddress: params.srcToken,
        dstTokenAddress: params.dstToken,
        walletAddress: walletConnection.address,
        enableEstimate: true
      };

      const quote = await swapManager.getQuote(quoteParams);

      // Execute swap
      const result = await swapManager.executeSwap(quote, {
        walletAddress: walletConnection.address,
        hashLock: '',
        preset: params.preset,
        source: 'nextjs-dapp',
        secretHashes: []
      });

      setState(prev => ({
        ...prev,
        swapResult: result,
        isLoading: false
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Swap execution failed'
      }));
      return null;
    }
  }, [walletConnection]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      swapResult: null, 
      quote: null,
      error: null 
    }));
  }, []);

  return {
    // State
    ...state,
    walletConnection,
    
    // Actions
    connectWallet,
    checkConnection,
    getQuote,
    executeSwap,
    clearError,
    clearResults,
    
    // Utilities
    formatAddress: WalletUtils.formatAddress
  };
}