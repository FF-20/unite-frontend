import { useState, useCallback } from 'react';
import { buildCustomOrder } from '../lib/crossChainOrder';
import { ethers } from 'ethers';

interface OrderState {
  status: 'idle' | 'creating' | 'completed' | 'error';
  orderHash?: string;
  error?: string;
}

interface OrderParams {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  preset: string;
  walletAddress: string;
}

export function useCrossChainOrder() {
  const [state, setState] = useState<OrderState>({ status: 'idle' });

  const createAndExecuteOrder = useCallback(async (params: OrderParams) => {
    try {
      setState({ status: 'creating' });

      // Get the signer (you may need to implement this based on your wallet connection)
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Build the order using your existing function
      const orderParams = {
        srcChainId: params.srcChainId,
        dstChainId: params.dstChainId,
        makerAsset: params.srcTokenAddress,
        takerAsset: params.dstTokenAddress,
        makingAmount: params.amount,
        takingAmount: params.amount, // You may want to calculate this based on rates
        allowPartialFills: false,
      };

      const result = await buildCustomOrder(orderParams, signer);

      setState({
        status: 'completed',
        orderHash: result.orderHash,
      });

      console.log('✅ Order created successfully:', result.orderHash);
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    createAndExecuteOrder,
    reset,
    isLoading: state.status === 'creating',
    isCompleted: state.status === 'completed',
    hasError: state.status === 'error',
  };
} 