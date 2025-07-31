import React, { useState, useEffect } from 'react';
import { connectWallet } from '../lib/wallet';

interface ConnectWalletProps {
  onAddressChange?: (address: string) => void;
}

export default function ConnectWallet({ onAddressChange }: ConnectWalletProps) {
  const [address, setAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check if already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          onAddressChange?.(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const { address: connectedAddress } = await connectWallet();
      setAddress(connectedAddress);
      onAddressChange?.(connectedAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    onAddressChange?.('');
  };

  if (address) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Connected Wallet</p>
            <p className="font-mono text-lg font-medium text-gray-800">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
          isConnecting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
        } text-white`}
      >
        {isConnecting ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Connecting...
          </div>
        ) : (
          'Connect Wallet'
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Supported Wallets */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-3">Supported wallets:</p>
        <div className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
            <span>MetaMask</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">W</div>
            <span>WalletConnect</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">C</div>
            <span>Coinbase</span>
          </div>
        </div>
      </div>
    </div>
  );
}