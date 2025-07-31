import React, { useState } from 'react';
import { config } from '../lib/config';
import { useCrossChainOrder } from '../hooks/useCrossChainOrder';
import { NetworkEnum, PresetEnum } from '@1inch/cross-chain-sdk';

interface OrderFormProps {
  walletAddress: string;
}

export default function OrderForm({ walletAddress }: OrderFormProps) {
  const [formData, setFormData] = useState({
    amount: '10000000', // 10 USDT (6 decimals)
    srcChainId: NetworkEnum.POLYGON,
    dstChainId: NetworkEnum.BINANCE,
    srcTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT on Polygon
    dstTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // BNB on BSC
    preset: PresetEnum.fast,
  });

  const { state, createAndExecuteOrder, reset, isLoading, isCompleted, hasError } = useCrossChainOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createAndExecuteOrder({
      ...formData,
      walletAddress
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Cross-Chain Order
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (smallest unit)
          </label>
          <input
            type="text"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10000000 (10 USDT)"
          />
        </div>

        {/* Source Chain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Chain
          </label>
          <select
            name="srcChainId"
            value={formData.srcChainId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={NetworkEnum.POLYGON}>Polygon</option>
            <option value={NetworkEnum.BINANCE}>Binance Smart Chain</option>
            <option value={NetworkEnum.ETHEREUM}>Ethereum</option>
            <option value={NetworkEnum.ARBITRUM}>Arbitrum</option>
          </select>
        </div>

        {/* Destination Chain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination Chain
          </label>
          <select
            name="dstChainId"
            value={formData.dstChainId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={NetworkEnum.BINANCE}>Binance Smart Chain</option>
            <option value={NetworkEnum.POLYGON}>Polygon</option>
            <option value={NetworkEnum.ETHEREUM}>Ethereum</option>
            <option value={NetworkEnum.ARBITRUM}>Arbitrum</option>
          </select>
        </div>

        {/* Source Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source Token Address
          </label>
          <input
            type="text"
            name="srcTokenAddress"
            value={formData.srcTokenAddress}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
          />
        </div>

        {/* Destination Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination Token Address
          </label>
          <input
            type="text"
            name="dstTokenAddress"
            value={formData.dstTokenAddress}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          />
        </div>

        {/* Preset */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speed Preset
          </label>
          <select
            name="preset"
            value={formData.preset}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={PresetEnum.fast}>Fast</option>
            <option value={PresetEnum.medium}>Medium</option>
            <option value={PresetEnum.slow}>Slow</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } text-white`}
        >
          {isLoading ? 'Processing...' : 'Create Cross-Chain Order'}
        </button>

        {/* Reset Button */}
        {(isCompleted || hasError) && (
          <button
            type="button"
            onClick={reset}
            className="w-full py-2 px-4 rounded-md font-medium bg-gray-500 hover:bg-gray-600 text-white transition-colors"
          >
            Create Another Order
          </button>
        )}
      </form>

      {/* Status Display */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Status:</div>
        <div className={`p-3 rounded-md text-sm ${
          hasError 
            ? 'bg-red-100 text-red-800' 
            : isCompleted 
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {state.progress}
        </div>

        {state.orderHash && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Order Hash:</div>
            <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all">
              {state.orderHash}
            </div>
          </div>
        )}

        {state.error && (
          <div className="mt-3">
            <div className="text-sm font-medium text-red-700 mb-1">Error:</div>
            <div className="p-2 bg-red-50 text-red-800 rounded text-xs">
              {state.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}