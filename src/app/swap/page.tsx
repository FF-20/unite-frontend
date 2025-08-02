'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { sdk } from '../../lib/deprecated-sdk';
import { crossEcosystemQuoteService, CrossEcosystemQuote, CROSS_ECOSYSTEM_CHAINS } from '../../lib/crossEcosystemQuote';
import { buildCustomOrder } from '../../lib/crossChainOrder';
import { OrderParams, CreatedOrder } from '../../lib/types';

interface Chain {
  id: string;
  name: string;
  ecosystem: 'evm' | 'cosmos';
  icon: string;
  nativeCurrency: string;
}

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: string;
  logoURI?: string;
}

interface CrossChainPreset {
  name: string;
  label: string;
  estimatedTime: string;
  securityLevel: string;
  description: string;
}

const presets: CrossChainPreset[] = [
  {
    name: 'fast',
    label: 'Fast',
    estimatedTime: '2-5 min',
    securityLevel: 'Standard',
    description: 'Quick cross-chain transfer with standard security'
  },
  {
    name: 'default',
    label: 'Secure',
    estimatedTime: '10-15 min',
    securityLevel: 'High',
    description: 'Balanced speed and maximum security'
  },
  {
    name: 'slow',
    label: 'Ultra Safe',
    estimatedTime: '30-60 min',
    securityLevel: 'Maximum',
    description: 'Maximum security with longer confirmation times'
  }
];

const chains: Chain[] = [
  {
    id: 'sepolia',
    name: 'Sepolia',
    ecosystem: 'evm',
    icon: '⟠',
    nativeCurrency: 'ETH'
  },
  {
    id: 'cosmoshub',
    name: 'Cosmos Hub',
    ecosystem: 'cosmos',
    icon: '⚛️',
    nativeCurrency: 'ATOM'
  },
  {
    id: 'osmosis',
    name: 'Osmosis',
    ecosystem: 'cosmos',
    icon: '🧪',
    nativeCurrency: 'OSMO'
  }
];

const tokens: Token[] = [
  {
    symbol: 'ETH',
    name: 'Sepolia ETH',
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    decimals: 18,
    chainId: 'sepolia',
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin (Sepolia)',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    chainId: 'sepolia',
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png'
  },
  {
    symbol: 'WETH',
    name: 'Wrapped ETH (Sepolia)',
    address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14', // From config.ts
    decimals: 18,
    chainId: 'sepolia',
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png'
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    address: 'uatom',
    decimals: 6,
    chainId: 'cosmoshub',
    logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png'
  },
  {
    symbol: 'OSMO',
    name: 'Osmosis',
    address: 'uosmo',
    decimals: 6,
    chainId: 'osmosis',
    logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png'
  }
];

export default function CrossChainSwapPage() {
  const [sourceChain, setSourceChain] = useState<Chain>(chains[0]);
  const [destinationChain, setDestinationChain] = useState<Chain>(chains[1]);
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[2]);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<CrossChainPreset>(presets[1]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [quote, setQuote] = useState<CrossEcosystemQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<CreatedOrder | null>(null);

  // Filter tokens based on selected chains
  const availableFromTokens = tokens.filter(token => token.chainId === sourceChain.id);
  const availableToTokens = tokens.filter(token => token.chainId === destinationChain.id);

  // Update tokens when chains change
  useEffect(() => {
    const newFromToken = availableFromTokens[0];
    const newToToken = availableToTokens[0];
    if (newFromToken) setFromToken(newFromToken);
    if (newToToken) setToToken(newToToken);
  }, [sourceChain, destinationChain]);

  // Get quote when amount or tokens change
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0 && fromToken && toToken && sourceChain.id !== destinationChain.id) {
      getQuote();
    } else {
      setQuote(null);
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken, sourceChain, destinationChain]);

  const getQuote = async () => {
    if (!fromAmount || !fromToken || !toToken) return;
    
    setQuoteLoading(true);
    try {
      console.log('Getting cross-ecosystem quote...');
      
      const quoteResult = await crossEcosystemQuoteService.getQuote({
        srcChainId: sourceChain.id,
        dstChainId: destinationChain.id,
        srcTokenAddress: fromToken.address,
        dstTokenAddress: toToken.address,
        amount: fromAmount,
        slippage: 1.0 // 1% slippage
      });
      
      console.log('Quote result:', quoteResult);
      setQuote(quoteResult);
      setToAmount(quoteResult.dstAmount);
      
    } catch (error) {
      console.error('Failed to get quote:', error);
      setQuote(null);
      setToAmount('');
    } finally {
      setQuoteLoading(false);
    }
  };

  async function wrapETHToWETH(
    signer: ethers.Signer, 
    amount: string, 
    wethAddress: string
  ): Promise<void> {
    console.log('🔄 Wrapping ETH to WETH...');
    
    const wethABI = [
      'function deposit() payable',
      'function balanceOf(address) view returns (uint256)'
    ];
    
    const wethContract = new ethers.Contract(wethAddress, wethABI, signer);
    const ethAmount = ethers.parseEther(amount);
    
    try {
      const tx = await wethContract.deposit({ value: ethAmount });
      console.log('📦 WETH wrap transaction:', tx.hash);
      
      await tx.wait();
      console.log('✅ ETH successfully wrapped to WETH');
      
      // Check balance
      const balance = await wethContract.balanceOf(await signer.getAddress());
      console.log('💰 WETH balance:', ethers.formatEther(balance));
      
    } catch (error) {
      console.error('❌ WETH wrapping failed:', error);
      throw new Error(`Failed to wrap ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Helper function to detect and convert ETH to WETH
  function convertETHToWETH(token: Token): Token {
    if (token.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      console.log('🔄 Converting ETH to WETH for cross-chain compatibility');
      return {
        ...token,
        symbol: 'WETH',
        name: 'Wrapped ETH (Auto-converted)',
        address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14' // WETH address from config
      };
    }
    return token;
  }

  const handleCrossChainSwap = async () => {
    if (!fromAmount || !fromToken || !toToken || sourceChain.id === destinationChain.id || !quote) return;
    
    setIsCreatingOrder(true);
    try {
      console.log('🌉 Creating cross-chain order with buildCustomOrder...');
      
      // Get signer from wallet
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }
      
      // Use modern MetaMask API to request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Convert chain IDs to numbers (Sepolia testnet)
      const srcChainIdNum = sourceChain.id === 'sepolia' ? 11155111 : parseInt(sourceChain.id);
      const dstChainIdNum = destinationChain.id === 'cosmoshub' ? 56 : parseInt(destinationChain.id);
      
      // 🔄 AUTO-CONVERT ETH TO WETH
      const actualFromToken = convertETHToWETH(fromToken);
      const needsWrapping = fromToken.address !== actualFromToken.address;
      
      if (needsWrapping) {
        console.log('⚠️ ETH detected - automatic conversion to WETH required');
        alert(`🔄 ETH Conversion Required\n\nNative ETH will be wrapped to WETH for cross-chain compatibility.\n\nAmount: ${fromAmount} ETH → ${fromAmount} WETH\nWETH Address: ${actualFromToken.address}\n\nThis will require 2 transactions:\n1. Wrap ETH to WETH\n2. Create cross-chain order`);
        
        // Perform the wrapping
        await wrapETHToWETH(signer, fromAmount, actualFromToken.address);
        
        console.log('✅ ETH wrapped to WETH successfully');
      }
      
      // Convert amount to proper format
      const makingAmountStr = fromAmount;
      const takingAmountStr = quote.dstAmount;

      
      
      // Build order parameters with WETH (if converted)
      const orderParams: OrderParams = {
        srcChainId: srcChainIdNum,
        dstChainId: dstChainIdNum, 
        makerAsset: actualFromToken.address, // Use WETH if converted
        takerAsset: toToken.address,
        makingAmount: makingAmountStr,
        takingAmount: takingAmountStr,
        allowPartialFills: true
      };
      
      console.log('📋 Order Parameters:', orderParams);
      console.log('📝 User Address:', await signer.getAddress());
      if (needsWrapping) {
        console.log('🔄 ETH → WETH Conversion Applied');
      }
      
      // Create order using buildCustomOrder
      const orderResult = await buildCustomOrder(orderParams, signer);
      
      setOrderResult(orderResult as CreatedOrder);
      console.log('✅ Custom order created successfully');
      
      // Show order details in popup
      const userAddress = await signer.getAddress();
      const conversionNote = needsWrapping ? `\n🔄 ETH Auto-Wrapped: ${fromAmount} ETH → ${fromAmount} WETH\n` : '\n';
      
      alert(`🎉 Cross-Chain Order Created with buildCustomOrder!\n\n` +
            `📋 ORDER DETAILS:\n` +
            `Order Hash: ${orderResult.orderHash}\n` +
            `Maker: ${userAddress}\n${conversionNote}` +
            `🌐 CHAINS:\n` +
            `Source: ${srcChainIdNum} (${sourceChain.name})\n` +
            `Destination: ${dstChainIdNum} (${destinationChain.name})\n\n` +
            `💰 ASSETS:\n` +
            `Making: ${makingAmountStr} ${actualFromToken.symbol}\n` +
            `Taking: ${takingAmountStr} ${toToken.symbol}\n` +
            `Exchange Rate: ${parseFloat(quote.exchangeRate).toFixed(6)}\n\n` +
            `⚙️ SETTINGS:\n` +
            `Partial Fills: ${orderParams.allowPartialFills ? '✅ Enabled' : '❌ Disabled'}\n` +
            `Maker Asset: ${orderParams.makerAsset}\n` +
            `Taker Asset: ${orderParams.takerAsset}\n\n` +
            `🔐 CRYPTOGRAPHIC DATA:\n` +
            `Signature: ${orderResult.signature ? orderResult.signature.slice(0, 20) + '...' : 'N/A'}\n` +
            `Secret: ${orderResult.secret.slice(0, 20)}...\n\n` +
            `🔧 Built using 1inch Cross-Chain SDK buildCustomOrder()\n` +
            `⚠️ Order created but not submitted to relayer (for testing)`);
      
    } catch (error: any) {
      console.error('❌ buildCustomOrder failed:', error);
      alert(`buildCustomOrder failed: ${error.message}\n\nPlease ensure:\n- MetaMask is connected and unlocked\n- You're on Sepolia testnet (Chain ID: 11155111)\n- You have sufficient ETH for wrapping + gas fees\n- Token addresses are valid\n\nError Details: ${error.stack ? error.stack.slice(0, 200) + '...' : 'No stack trace available'}`);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleFlipChains = () => {
    setSourceChain(destinationChain);
    setDestinationChain(sourceChain);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">1inch Custom Order Builder</h1>
          <p className="text-gray-600">Build custom cross-chain orders using 1inch SDK (Sepolia Testnet)</p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 mt-2">
            🧪 Testnet Mode - buildCustomOrder()
          </div>
        </div>

        {/* Main Swap Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                     {/* Bridge Presets */}
           <div className="mb-6">
             <label className="block text-sm font-medium text-gray-700 mb-3">
               Bridge Security & Speed
             </label>
             <div className="flex space-x-2">
               {presets.map((preset) => (
                 <button
                   key={preset.name}
                   onClick={() => setSelectedPreset(preset)}
                   className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                     selectedPreset.name === preset.name
                       ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                   }`}
                 >
                   <div className="text-center">
                     <div className="font-semibold">{preset.label}</div>
                     <div className="text-xs opacity-75">{preset.estimatedTime}</div>
                   </div>
                 </button>
               ))}
             </div>
             <p className="text-xs text-gray-500 mt-2">{selectedPreset.description}</p>
           </div>

           {/* Source Chain */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">From Chain</label>
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <select
                 value={sourceChain.id}
                 onChange={(e) => {
                   const chain = chains.find(c => c.id === e.target.value);
                   if (chain) setSourceChain(chain);
                 }}
                 className="w-full bg-transparent text-lg font-semibold text-gray-900 border-none outline-none"
               >
                 {chains.map((chain) => (
                   <option key={chain.id} value={chain.id}>
                     {chain.icon} {chain.name} ({chain.ecosystem.toUpperCase()})
                   </option>
                 ))}
               </select>
             </div>
           </div>

                     {/* From Token */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">From Token</label>
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <div className="flex justify-between items-center mb-2">
                 <select
                   value={fromToken.address}
                   onChange={(e) => {
                     const token = availableFromTokens.find(t => t.address === e.target.value);
                     if (token) setFromToken(token);
                   }}
                   className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none"
                 >
                   {availableFromTokens.map((token) => (
                     <option key={token.address} value={token.address}>
                       {token.symbol} - {token.name}
                     </option>
                   ))}
                 </select>
                 <div className="text-sm text-gray-500">Balance: 0.00</div>
               </div>
               <input
                 type="number"
                 value={fromAmount}
                 onChange={(e) => setFromAmount(e.target.value)}
                 placeholder="0.0"
                 className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900"
               />
               {quote && fromAmount && (
                 <div className="text-sm text-gray-500 mt-1">
                   ≈ ${parseFloat(quote.srcAmountUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                 </div>
               )}
             </div>
           </div>

                     {/* Flip Button */}
           <div className="flex justify-center mb-4">
             <button
               onClick={handleFlipChains}
               className="bg-white border-2 border-gray-200 rounded-full p-3 hover:border-blue-300 transition-colors shadow-sm"
             >
               <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
               </svg>
             </button>
           </div>

           {/* Destination Chain */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">To Chain</label>
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <select
                 value={destinationChain.id}
                 onChange={(e) => {
                   const chain = chains.find(c => c.id === e.target.value);
                   if (chain) setDestinationChain(chain);
                 }}
                 className="w-full bg-transparent text-lg font-semibold text-gray-900 border-none outline-none"
               >
                 {chains.filter(c => c.id !== sourceChain.id).map((chain) => (
                   <option key={chain.id} value={chain.id}>
                     {chain.icon} {chain.name} ({chain.ecosystem.toUpperCase()})
                   </option>
                 ))}
               </select>
             </div>
           </div>

                     {/* To Token */}
           <div className="mb-6">
             <label className="block text-sm font-medium text-gray-700 mb-2">To Token</label>
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <div className="flex justify-between items-center mb-2">
                 <select
                   value={toToken.address}
                   onChange={(e) => {
                     const token = availableToTokens.find(t => t.address === e.target.value);
                     if (token) setToToken(token);
                   }}
                   className="bg-transparent text-lg font-semibold text-gray-900 border-none outline-none"
                 >
                   {availableToTokens.map((token) => (
                     <option key={token.address} value={token.address}>
                       {token.symbol} - {token.name}
                     </option>
                   ))}
                 </select>
                 <div className="text-sm text-gray-500">Balance: 0.00</div>
               </div>
               <div className="flex items-center">
                 <input
                   type="number"
                   value={toAmount}
                   placeholder="0.0"
                   className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900"
                   readOnly
                 />
                 {quoteLoading && (
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 ml-2"></div>
                 )}
               </div>
               {quote && toAmount && (
                 <div className="text-sm text-gray-500 mt-1">
                   ≈ ${parseFloat(quote.dstAmountUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                 </div>
               )}
             </div>
           </div>

                     {/* Cross-Chain Info */}
           <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-100">
             {quote ? (
               <>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Route</span>
                   <span>{quote.route.name}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Exchange Rate</span>
                   <span>1 {fromToken.symbol} = {parseFloat(quote.exchangeRate).toFixed(4)} {toToken.symbol}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Estimated Time</span>
                   <span>{quote.estimatedTime} min</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Price Impact</span>
                   <span className={quote.priceImpact > 1 ? 'text-red-600' : 'text-green-600'}>
                     {quote.priceImpact.toFixed(2)}%
                   </span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Bridge Fee</span>
                   <span>{parseFloat(quote.bridgeFee).toFixed(6)} {fromToken.symbol}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Total Fees</span>
                   <div className="text-right">
                     <div>{parseFloat(quote.totalFees).toFixed(6)} {fromToken.symbol}</div>
                     <div className="text-xs text-purple-600">
                       ≈ ${parseFloat(quote.totalFeesUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </div>
                   </div>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Token Prices</span>
                   <div className="text-right text-xs">
                     <div>{fromToken.symbol}: ${quote.srcTokenUsdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                     <div>{toToken.symbol}: ${quote.dstTokenUsdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                   </div>
                 </div>
                 <div className="border-t border-purple-200 pt-2">
                   <div className="flex justify-between text-xs text-purple-700 mb-1">
                     <span>🛡️ Security Protection</span>
                     <span className="text-green-600">ENABLED</span>
                   </div>
                   <div className="flex justify-between text-xs text-purple-600 mb-1">
                     <span>Minimum Guarantee</span>
                     <span>{parseFloat(quote.minDstAmount).toFixed(4)} {toToken.symbol}</span>
                   </div>
                   <div className="flex justify-between text-xs text-purple-600">
                     <span>Price Impact</span>
                     <span>{quote.priceImpact.toFixed(2)}%</span>
                   </div>
                 </div>
               </>
             ) : (
               <>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Route</span>
                   <span>{sourceChain.name} → {destinationChain.name}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Estimated Time</span>
                   <span>{selectedPreset.estimatedTime}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800 mb-2">
                   <span>Security Level</span>
                   <span className="text-green-600">{selectedPreset.securityLevel}</span>
                 </div>
                 <div className="flex justify-between text-sm text-purple-800">
                   <span>Bridge Fee</span>
                   <span>Enter amount for quote</span>
                 </div>
               </>
             )}
           </div>

                     {/* Bridge Button */}
           <button
             onClick={handleCrossChainSwap}
             disabled={!fromAmount || !fromToken || !toToken || sourceChain.id === destinationChain.id || isCreatingOrder || !quote || quoteLoading}
             className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
               !fromAmount || !fromToken || !toToken || sourceChain.id === destinationChain.id || isCreatingOrder || !quote || quoteLoading
                 ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                 : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
             }`}
           >
                         {isCreatingOrder ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Building Order...
              </div>
            ) : quoteLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-2"></div>
                Getting Quote...
              </div>
            ) : sourceChain.id === destinationChain.id ? (
              'Select Different Chains'
            ) : !quote && fromAmount ? (
              'Getting Quote...'
            ) : !fromAmount ? (
              'Enter Amount'
            ) : (
              `Build Custom Order for ${destinationChain.name}`
            )}
           </button>
        </div>

                 {/* Cross-Chain Details */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
           <h3 className="font-semibold text-gray-900 mb-3">Cross-Chain Details</h3>
           <div className="space-y-2 text-sm">
             <div className="flex justify-between">
               <span className="text-gray-600">Source Ecosystem</span>
               <span className="text-gray-900 capitalize">{sourceChain.ecosystem}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-600">Destination Ecosystem</span>
               <span className="text-gray-900 capitalize">{destinationChain.ecosystem}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-600">Bridge Type</span>
               <span className="text-gray-900">
                 {sourceChain.ecosystem === destinationChain.ecosystem ? 'Same Ecosystem' : 'Cross-Ecosystem'}
               </span>
             </div>
             <div className="flex justify-between">
               <span className="text-gray-600">Security Model</span>
               <span className="text-gray-900">{selectedPreset.securityLevel}</span>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
} 