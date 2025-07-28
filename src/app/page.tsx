'use client';

import { useState, useEffect } from 'react';
import { useSwap } from '@/hooks/useSwap';

interface SwapFormData {
  srcAmount: string;
  srcToken: string;
  dstToken: string;
  preset: 'fast' | 'medium' | 'slow';
}

export default function CrossChainSwapPage() {
  const {
    // State
    isConnected,
    address,
    isLoading,
    error,
    swapResult,
    quote,
    
    // Actions
    connectWallet,
    checkConnection,
    getQuote,
    executeSwap,
    clearError,
    clearResults,
    formatAddress
  } = useSwap();

  const [formData, setFormData] = useState<SwapFormData>({
    srcAmount: '100',
    srcToken: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Example USDC on Sepolia
    dstToken: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Example token
    preset: 'fast'
  });

  const [showQuote, setShowQuote] = useState(false);

  // Check wallet connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle form input changes
  const handleInputChange = (field: keyof SwapFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear previous results when form changes
    if (quote || swapResult) {
      clearResults();
      setShowQuote(false);
    }
  };

  // Handle get quote
  const handleGetQuote = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    const result = await getQuote(formData);
    if (result) {
      setShowQuote(true);
    }
  };

  // Handle execute swap
  const handleExecuteSwap = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    await executeSwap(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              1inch Cross-Chain Swap
            </h1>
            <p className="text-gray-600">
              Atomic swaps between chains using 1inch protocol
            </p>
          </div>

          {/* Wallet Status */}
          <div className="mb-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Wallet Status</h3>
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 font-medium">
                    {formatAddress(address)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-700 font-medium">Not connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Swap Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Amount to Swap
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.srcAmount}
                  onChange={(e) => handleInputChange('srcAmount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="100"
                />
                <div className="absolute right-3 top-3 text-gray-500 font-medium">
                  USDC
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Source Token Address
              </label>
              <input
                type="text"
                value={formData.srcToken}
                onChange={(e) => handleInputChange('srcToken', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Destination Token Address
              </label>
              <input
                type="text"
                value={formData.dstToken}
                onChange={(e) => handleInputChange('dstToken', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Swap Speed
              </label>
              <select
                value={formData.preset}
                onChange={(e) => handleInputChange('preset', e.target.value as 'fast' | 'medium' | 'slow')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fast">⚡ Fast (4 secrets) - Higher fees</option>
                <option value="medium">🚀 Medium (8 secrets) - Balanced</option>
                <option value="slow">🐌 Slow (16 secrets) - Lower fees</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            {!showQuote ? (
              <button
                onClick={handleGetQuote}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Getting Quote...
                  </div>
                ) : !isConnected ? (
                  'Connect Wallet & Get Quote'
                ) : (
                  'Get Quote'
                )}
              </button>
            ) : (
              <button
                onClick={handleExecuteSwap}
                disabled={isLoading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Executing Swap...
                  </div>
                ) : (
                  'Execute Swap'
                )}
              </button>
            )}
          </div>

          {/* Quote Display */}
          {quote && showQuote && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-4 text-lg">💰 Quote Details</h4>
              <div className="space-y-3 text-blue-800">
                <div className="flex justify-between">
                  <span>You Pay:</span>
                  <span className="font-semibold">{formData.srcAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>You Receive:</span>
                  <span className="font-semibold">≈ 0.95 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Secrets Count:</span>
                  <span className="font-semibold">{quote.presets[formData.preset].secretsCount}</span>
                </div>
                <div className="border-t border-blue-300 pt-3 mt-3">
                  <p className="text-sm text-blue-700">
                    ⚠️ This is a test quote. Actual rates will vary based on market conditions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">❌ Error</h4>
                  <p className="text-red-700">{error}</p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Success Display */}
          {swapResult && (
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl">
              <h4 className="font-semibold text-green-800 mb-4 text-lg">
                ✅ Swap Created Successfully!
              </h4>
              <div className="space-y-3 text-sm text-green-700">
                <div>
                  <strong>Order Hash:</strong>
                  <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                    {swapResult.orderHash}
                  </div>
                </div>
                {swapResult.txHash && (
                  <div>
                    <strong>Transaction Hash:</strong>
                    <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                      {swapResult.txHash}
                    </div>
                  </div>
                )}
                {swapResult.srcEscrowAddress && (
                  <div>
                    <strong>Source Escrow:</strong>
                    <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                      {swapResult.srcEscrowAddress}
                    </div>
                  </div>
                )}
                {swapResult.dstEscrowAddress && (
                  <div>
                    <strong>Destination Escrow:</strong>
                    <div className="font-mono text-xs bg-white p-2 rounded mt-1 break-all">
                      {swapResult.dstEscrowAddress}
                    </div>
                  </div>
                )}
                <div className="border-t border-green-300 pt-3 mt-4">
                  <p className="text-xs text-green-600">
                    🔄 Secret monitoring is running in the background. Check console for detailed logs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 className="font-semibold text-amber-800 mb-3">📋 Setup Instructions</h4>
            <ol className="list-decimal list-inside text-sm text-amber-700 space-y-2">
              <li>Install MetaMask and connect to Sepolia testnet</li>
              <li>Get Sepolia ETH from faucets for gas fees</li>
              <li>Update contract addresses in <code className="bg-amber-100 px-1 rounded">lib/constants.ts</code></li>
              <li>Deploy or find the Limit Order Protocol contract address</li>
              <li>Ensure you have test tokens in your wallet</li>
              <li>Monitor browser console for detailed execution logs</li>
            </ol>
            <div className="mt-4 p-3 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Important:</strong> This is a testnet implementation. Make sure all contract addresses 
                are correctly configured before using with real funds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}