'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ConnectWallet from '../components/ConnectWallet';
import OrderForm from '../components/OrderForm';

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showOrderForm, setShowOrderForm] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Unite Protocol
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Seamless cross-chain bridging and trading across multiple ecosystems with lightning-fast execution and ultra-secure protocols.
          </p>
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-yellow-100 text-yellow-800 mt-4">
            🧪 Running on Sepolia Testnet
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Cross-Chain Bridge Card */}
          <Link href="/swap" className="group">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-blue-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold mr-4">
                  🌉
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Cross-Chain Bridge</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Bridge assets seamlessly between EVM and Cosmos ecosystems with our advanced cross-chain technology.
              </p>
              <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                Start Bridging
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Cross-Chain Orders Card */}
          <div 
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200 cursor-pointer"
            onClick={() => setShowOrderForm(!showOrderForm)}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold mr-4">
                📋
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cross-Chain Orders</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Create advanced cross-chain orders with custom execution logic and automated settlement.
            </p>
            <div className="flex items-center text-purple-600 font-medium hover:text-purple-700">
              {showOrderForm ? 'Hide Order Form' : 'Create Order'}
              <svg className={`w-4 h-4 ml-2 transition-transform ${showOrderForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Wallet Connection</h3>
          <ConnectWallet onAddressChange={setWalletAddress} />
          {walletAddress && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                <span className="font-medium">Connected:</span> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {/* Advanced Order Form */}
        {showOrderForm && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Advanced: Create Cross-Chain Order (Sepolia Testnet)</h3>
            {walletAddress ? (
              <OrderForm walletAddress={walletAddress} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Please connect your wallet to create orders</p>
                <div className="text-sm text-gray-500">
                  Connect your wallet above to get started with cross-chain orders
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 p-8 rounded-2xl text-white">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-bold mb-2">Lightning Fast</h4>
              <p className="text-blue-100">Execute trades in seconds across multiple chains</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="font-bold mb-2">Ultra Secure</h4>
              <p className="text-blue-100">Military-grade security with atomic swaps</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🌐</div>
              <h4 className="font-bold mb-2">Multi-Ecosystem</h4>
              <p className="text-blue-100">EVM, Cosmos, and beyond - all in one place</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}