// Cross-Ecosystem Quote System
// For bridging between EVM (Ethereum) and Cosmos ecosystems

export interface CrossEcosystemToken {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: string;
    ecosystem: 'evm' | 'cosmos' | 'solana' | 'polkadot';
    logoURI?: string;
}

export interface CrossEcosystemChain {
    chainId: string;
    name: string;
    ecosystem: 'evm' | 'cosmos' | 'solana' | 'polkadot';
    rpcUrl: string;
    nativeCurrency: CrossEcosystemToken;
    blockTime: number; // seconds
}

export interface BridgeRoute {
    bridgeProtocol: 'gravity' | 'axelar' | 'wormhole' | 'stargate' | 'ibc';
    name: string;
    estimatedTime: number; // minutes
    baseFee: string; // in native currency
    feePercentage: number; // 0.1 = 0.1%
    minAmount: string;
    maxAmount: string;
    trustLevel: 'high' | 'medium' | 'low';
    isActive: boolean;
}

export interface CrossEcosystemQuote {
    // Basic info
    srcChain: CrossEcosystemChain;
    dstChain: CrossEcosystemChain;
    srcToken: CrossEcosystemToken;
    dstToken: CrossEcosystemToken;
    
    // Amounts
    srcAmount: string; // input amount
    dstAmount: string; // estimated output amount
    minDstAmount: string; // minimum guaranteed output
    
    // USD Pricing
    srcTokenUsdPrice: number; // USD price of source token
    dstTokenUsdPrice: number; // USD price of destination token
    srcAmountUsd: string; // USD value of source amount
    dstAmountUsd: string; // USD value of destination amount
    
    // Pricing
    exchangeRate: string; // srcToken/dstToken rate
    priceImpact: number; // percentage
    
    // Fees
    bridgeFee: string; // bridge fee in src currency
    srcGasFee: string; // gas fee on source chain
    dstGasFee: string; // gas fee on destination chain
    totalFees: string; // total fees in src currency
    totalFeesUsd: string; // total fees in USD
    
    // Route
    route: BridgeRoute;
    estimatedTime: number; // minutes
    
    // Meta
    validUntil: number; // timestamp
    quoteId: string;
}

export interface CrossEcosystemQuoteParams {
    srcChainId: string;
    dstChainId: string;
    srcTokenAddress: string;
    dstTokenAddress: string;
    amount: string;
    slippage?: number; // default 1%
}

// Supported chains
export const CROSS_ECOSYSTEM_CHAINS: Record<string, CrossEcosystemChain> = {
    // EVM Chains
    'sepolia': {
        chainId: '11155111',
        name: 'Sepolia',
        ecosystem: 'evm',
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        nativeCurrency: {
            address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            symbol: 'ETH',
            name: 'Sepolia ETH',
            decimals: 18,
            chainId: '11155111',
            ecosystem: 'evm'
        },
        blockTime: 12
    },
    
    // Cosmos Chains
    'cosmoshub': {
        chainId: 'cosmoshub-4',
        name: 'Cosmos Hub',
        ecosystem: 'cosmos',
        rpcUrl: 'https://rpc-cosmoshub.blockapsis.com',
        nativeCurrency: {
            address: 'uatom',
            symbol: 'ATOM',
            name: 'Cosmos',
            decimals: 6,
            chainId: 'cosmoshub-4',
            ecosystem: 'cosmos'
        },
        blockTime: 6
    },
    
    'osmosis': {
        chainId: 'osmosis-1',
        name: 'Osmosis',
        ecosystem: 'cosmos',
        rpcUrl: 'https://rpc-osmosis.blockapsis.com',
        nativeCurrency: {
            address: 'uosmo',
            symbol: 'OSMO',
            name: 'Osmosis',
            decimals: 6,
            chainId: 'osmosis-1',
            ecosystem: 'cosmos'
        },
        blockTime: 6
    }
};

// Available bridge routes
export const BRIDGE_ROUTES: BridgeRoute[] = [
    {
        bridgeProtocol: 'gravity',
        name: 'Gravity Bridge',
        estimatedTime: 15, // 15 minutes
        baseFee: '0.001', // 0.001 ETH
        feePercentage: 0.1, // 0.1%
        minAmount: '0.01',
        maxAmount: '1000',
        trustLevel: 'high',
        isActive: true
    },
    {
        bridgeProtocol: 'axelar',
        name: 'Axelar Network',
        estimatedTime: 10,
        baseFee: '0.002',
        feePercentage: 0.15,
        minAmount: '0.01',
        maxAmount: '500',
        trustLevel: 'high',
        isActive: true
    },
    {
        bridgeProtocol: 'wormhole',
        name: 'Wormhole Bridge',
        estimatedTime: 5,
        baseFee: '0.0015',
        feePercentage: 0.05,
        minAmount: '0.005',
        maxAmount: '2000',
        trustLevel: 'medium',
        isActive: true
    }
];

// Custom quote service
export class CrossEcosystemQuoteService {
    
    async getQuote(params: CrossEcosystemQuoteParams): Promise<CrossEcosystemQuote> {
        const {
            srcChainId,
            dstChainId,
            srcTokenAddress,
            dstTokenAddress,
            amount,
            slippage = 1
        } = params;

        // Get chain info
        const srcChain = CROSS_ECOSYSTEM_CHAINS[srcChainId];
        const dstChain = CROSS_ECOSYSTEM_CHAINS[dstChainId];
        
        if (!srcChain || !dstChain) {
            throw new Error('Unsupported chain');
        }

        // Get token info (simplified - in reality would fetch from APIs)
        const srcToken = await this.getTokenInfo(srcChain, srcTokenAddress);
        const dstToken = await this.getTokenInfo(dstChain, dstTokenAddress);

        // Get USD prices for both tokens
        const srcTokenUsdPrice = await this.getCoinGeckoPrice(srcToken.symbol);
        const dstTokenUsdPrice = await this.getCoinGeckoPrice(dstToken.symbol);
        
        if (!srcTokenUsdPrice || !dstTokenUsdPrice) {
            throw new Error('Unable to fetch token prices');
        }
        
        // Calculate exchange rate
        const exchangeRate = srcTokenUsdPrice / dstTokenUsdPrice;
        
        // Calculate amounts
        const srcAmountBN = parseFloat(amount);
        const dstAmountRaw = srcAmountBN * exchangeRate;
        
        // Calculate USD values
        const srcAmountUsd = (srcAmountBN * srcTokenUsdPrice).toString();
        const dstAmountUsdRaw = dstAmountRaw * dstTokenUsdPrice;
        
        // Select best route
        const route = this.selectBestRoute(srcChain, dstChain, srcAmountBN);
        
        // Calculate fees
        const bridgeFee = this.calculateBridgeFee(srcAmountBN, route);
        const srcGasFee = await this.estimateGasFee(srcChain);
        const dstGasFee = await this.estimateGasFee(dstChain);
        const totalFees = bridgeFee + srcGasFee + dstGasFee;
        const totalFeesUsd = (totalFees * srcTokenUsdPrice).toString();
        
        // Apply slippage and fees
        const dstAmount = (dstAmountRaw - totalFees).toString();
        const dstAmountUsd = ((parseFloat(dstAmount) * dstTokenUsdPrice)).toString();
        const minDstAmount = (parseFloat(dstAmount) * (1 - slippage / 100)).toString();
        
        // Calculate price impact
        const priceImpact = this.calculatePriceImpact(srcAmountBN, exchangeRate);

        return {
            srcChain,
            dstChain,
            srcToken,
            dstToken,
            srcAmount: amount,
            dstAmount,
            minDstAmount,
            srcTokenUsdPrice,
            dstTokenUsdPrice,
            srcAmountUsd,
            dstAmountUsd,
            exchangeRate: exchangeRate.toString(),
            priceImpact,
            bridgeFee: bridgeFee.toString(),
            srcGasFee: srcGasFee.toString(),
            dstGasFee: dstGasFee.toString(),
            totalFees: totalFees.toString(),
            totalFeesUsd,
            route,
            estimatedTime: route.estimatedTime,
            validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes
            quoteId: this.generateQuoteId()
        };
    }

    private async getTokenInfo(chain: CrossEcosystemChain, tokenAddress: string): Promise<CrossEcosystemToken> {
        // Handle ETH placeholder address
        if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' || tokenAddress ===  '0xfff9976782d46cc05630d1f6ebab18b2324d6b14') {
            return {
                address: tokenAddress,
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
                chainId: chain.chainId,
                ecosystem: chain.ecosystem
            };
        }
        
        // Return native currency if address matches
        if (tokenAddress === chain.nativeCurrency.address) {
            return chain.nativeCurrency;
        }
        
        // Try to get token info from CoinGecko
        try {
            const tokenInfo = await this.getCoinGeckoTokenInfo(chain, tokenAddress);
            if (tokenInfo) {
                return tokenInfo;
            }
        } catch (error) {
            console.error('Failed to fetch token info from CoinGecko:', error);
        }
        
        // Fallback to known tokens
        const knownTokens = this.getKnownTokens(chain);
        const knownToken = knownTokens[tokenAddress.toLowerCase()];
        
        if (knownToken) {
            return knownToken;
        }
        
        // Final fallback - return unknown token
        return {
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 18,
            chainId: chain.chainId,
            ecosystem: chain.ecosystem
        };
    }

    private async getCoinGeckoTokenInfo(chain: CrossEcosystemChain, tokenAddress: string): Promise<CrossEcosystemToken | null> {
        // CoinGecko token info by contract address (for EVM chains)
        if (chain.ecosystem !== 'evm') {
            return null;
        }
        
        try {
            // Map chain IDs to CoinGecko platform IDs
            const platformIds: Record<string, string> = {
                '11155111': 'ethereum', // Sepolia uses ethereum platform for token lookups
                '1': 'ethereum',
                '56': 'binance-smart-chain',
                '137': 'polygon-pos',
                '42161': 'arbitrum-one'
            };
            
            const platformId = platformIds[chain.chainId];
            if (!platformId) {
                return null;
            }
            
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${tokenAddress}`,
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(5000)
                }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`Token not found on CoinGecko: ${tokenAddress}`);
                    return null;
                }
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                address: tokenAddress,
                symbol: data.symbol?.toUpperCase() || 'UNKNOWN',
                name: data.name || 'Unknown Token',
                decimals: data.detail_platforms?.[platformId]?.decimal_place || 18,
                chainId: chain.chainId,
                ecosystem: chain.ecosystem,
                logoURI: data.image?.small
            };
        } catch (error) {
            console.error(`Failed to fetch token info for ${tokenAddress}:`, error);
            return null;
        }
    }

    private getKnownTokens(chain: CrossEcosystemChain): Record<string, CrossEcosystemToken> {
        // Known token addresses for each chain
        const knownTokens: Record<string, Record<string, CrossEcosystemToken>> = {
            // Sepolia testnet
            '11155111': {
                '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': {
                    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
                    symbol: 'USDC',
                    name: 'USD Coin (Sepolia)',
                    decimals: 6,
                    chainId: '11155111',
                    ecosystem: 'evm'
                },
                '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': {
                    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
                    symbol: 'WETH',
                    name: 'Wrapped ETH (Sepolia)',
                    decimals: 18,
                    chainId: '11155111',
                    ecosystem: 'evm'
                }
            },
            // Cosmos Hub
            'cosmoshub-4': {
                'uatom': {
                    address: 'uatom',
                    symbol: 'ATOM',
                    name: 'Cosmos',
                    decimals: 6,
                    chainId: 'cosmoshub-4',
                    ecosystem: 'cosmos'
                }
            },
            // Osmosis
            'osmosis-1': {
                'uosmo': {
                    address: 'uosmo',
                    symbol: 'OSMO',
                    name: 'Osmosis',
                    decimals: 6,
                    chainId: 'osmosis-1',
                    ecosystem: 'cosmos'
                }
            }
        };
        
        return knownTokens[chain.chainId] || {};
    }

    private async getExchangeRate(fromSymbol: string, toSymbol: string): Promise<number> {
        try {
            // CoinGecko API - Get current prices in USD
            const fromPrice = await this.getCoinGeckoPrice(fromSymbol);
            const toPrice = await this.getCoinGeckoPrice(toSymbol);
            
            if (!fromPrice || !toPrice) {
                console.warn(`Price not found for ${fromSymbol}/${toSymbol}, using fallback`);
                return this.getFallbackRate(fromSymbol, toSymbol);
            }
            
            // Calculate exchange rate: fromPrice / toPrice
            const rate = fromPrice / toPrice;
            console.log(`Exchange rate ${fromSymbol}/${toSymbol}: ${rate}`);
            
            return rate;
        } catch (error) {
            console.error('CoinGecko API error:', error);
            return this.getFallbackRate(fromSymbol, toSymbol);
        }
    }

    private async getCoinGeckoPrice(symbol: string): Promise<number | null> {
        // Map symbols to CoinGecko IDs
        const coinGeckoIds: Record<string, string> = {
            'ETH': 'ethereum',
            'ATOM': 'cosmos',
            'OSMO': 'osmosis',
            'BTC': 'bitcoin',
            'USDC': 'usd-coin',
            'USDT': 'tether',
            'BNB': 'binancecoin'
        };
        
        const coinId = coinGeckoIds[symbol.toUpperCase()];
        if (!coinId) {
            console.warn(`CoinGecko ID not found for symbol: ${symbol}`);
            return null;
        }
        
        try {
            // Call CoinGecko API directly
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                    // Add timeout
                    signal: AbortSignal.timeout(5000)
                }
            );
            
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            
            const data = await response.json();
            const price = data[coinId]?.usd;
            
            if (typeof price !== 'number') {
                throw new Error(`Invalid price data for ${symbol}`);
            }
            
            return price;
        } catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
            return null;
        }
    }

    private getFallbackRate(fromSymbol: string, toSymbol: string): number {
        
        // If no fallback rate, return 1 (1:1 ratio)
        console.warn(`No fallback rate found for ${fromSymbol}/${toSymbol}, using 1:1`);
        return 1;
    }

    private selectBestRoute(srcChain: CrossEcosystemChain, dstChain: CrossEcosystemChain, amount: number): BridgeRoute {
        // Filter available routes
        const availableRoutes = BRIDGE_ROUTES.filter(route => 
            route.isActive && 
            amount >= parseFloat(route.minAmount) && 
            amount <= parseFloat(route.maxAmount)
        );

        if (availableRoutes.length === 0) {
            throw new Error('No available routes for this amount');
        }

        // Select best route based on fees and time
        return availableRoutes.reduce((best, current) => {
            const bestScore = this.calculateRouteScore(best);
            const currentScore = this.calculateRouteScore(current);
            return currentScore > bestScore ? current : best;
        });
    }

    private calculateRouteScore(route: BridgeRoute): number {
        // Score based on fees (lower is better) and time (faster is better)
        const feeScore = 1 / (parseFloat(route.baseFee) + route.feePercentage);
        const timeScore = 1 / route.estimatedTime;
        const trustScore = route.trustLevel === 'high' ? 1.5 : route.trustLevel === 'medium' ? 1 : 0.5;
        
        return feeScore + timeScore + trustScore;
    }

    private calculateBridgeFee(amount: number, route: BridgeRoute): number {
        return parseFloat(route.baseFee) + (amount * route.feePercentage / 100);
    }

    private async estimateGasFee(chain: CrossEcosystemChain): Promise<number> {
        // Mock gas estimation - replace with real gas price APIs
        const mockGasFees: Record<string, number> = {
            'sepolia': 0.001, // Lower fees on testnet
            'cosmoshub': 0.001, // Very low Cosmos fees
            'osmosis': 0.001
        };
        
        return mockGasFees[chain.name.toLowerCase()] || 0.001;
    }

    private calculatePriceImpact(amount: number, rate: number): number {
        // Mock price impact calculation
        // In reality, this would consider liquidity pools
        if (amount < 1) return 0.1; // 0.1%
        if (amount < 10) return 0.3; // 0.3%
        if (amount < 100) return 0.8; // 0.8%
        return 1.5; // 1.5% for large amounts
    }

    private generateQuoteId(): string {
        return 'quote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export singleton instance
export const crossEcosystemQuoteService = new CrossEcosystemQuoteService(); 