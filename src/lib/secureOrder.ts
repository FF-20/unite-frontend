// Secure Cross-Chain Order System
// Implements security measures to prevent MEV attacks and slippage manipulation

import { ethers } from 'ethers';
import { CrossEcosystemQuote } from './crossEcosystemQuote';

export interface SecureOrderParams {
    quote: CrossEcosystemQuote;
    userAddress: string;
    deadline: number; // Unix timestamp
    signature?: string; // User signature for commitment
}

export interface OrderCommitment {
    orderHash: string;
    commitment: string; // Hash of order parameters
    revealDeadline: number; // When order details are revealed
    executionDeadline: number; // When order must be executed
}

export class SecureOrderService {
    
    /**
     * Create a secure order commitment (hide order details)
     * This prevents front-running by hiding actual parameters
     */
    async createOrderCommitment(params: SecureOrderParams): Promise<OrderCommitment> {
        const { quote, userAddress, deadline } = params;
        
        // Create commitment hash (hides order details)
        const orderData = {
            srcChainId: quote.srcChain.chainId,
            dstChainId: quote.dstChain.chainId,
            srcTokenAddress: quote.srcToken.address,
            dstTokenAddress: quote.dstToken.address,
            srcAmount: quote.srcAmount,
            minDstAmount: quote.absoluteMinAmount, // Use absolute minimum!
            userAddress,
            deadline,
            nonce: Date.now() + Math.random()
        };
        
        // Hash the order data to create commitment
        const orderHash = ethers.keccak256(
            ethers.toUtf8Bytes(JSON.stringify(orderData))
        );
        
        // Create blinded commitment
        const salt = ethers.randomBytes(32);
        const commitment = ethers.keccak256(
            ethers.concat([orderHash, salt])
        );
        
        console.log('🔒 Order commitment created:', {
            orderHash: orderHash.slice(0, 10) + '...',
            commitment: commitment.slice(0, 10) + '...',
            minAmount: quote.absoluteMinAmount,
            maxSlippage: quote.maxSlippage + '%'
        });
        
        return {
            orderHash,
            commitment: ethers.hexlify(commitment),
            revealDeadline: Date.now() + 60 * 1000, // 1 minute to reveal
            executionDeadline: deadline
        };
    }
    
    /**
     * Validate order execution against original quote
     * Prevents manipulation of destination amounts
     */
    validateOrderExecution(
        originalQuote: CrossEcosystemQuote, 
        actualDstAmount: string
    ): { isValid: boolean; reason?: string } {
        
        const actualAmount = parseFloat(actualDstAmount);
        const minAmount = parseFloat(originalQuote.minDstAmount);
        const absoluteMin = parseFloat(originalQuote.absoluteMinAmount);
        
        // Check 1: Must meet minimum amount
        if (actualAmount < absoluteMin) {
            return {
                isValid: false,
                reason: `Amount ${actualAmount} below absolute minimum ${absoluteMin}`
            };
        }
        
        // Check 2: Quote must not be expired
        if (Date.now() > originalQuote.validUntil) {
            return {
                isValid: false,
                reason: 'Quote has expired'
            };
        }
        
        // Check 3: Reasonable slippage check
        const expectedAmount = parseFloat(originalQuote.dstAmount);
        const actualSlippage = ((expectedAmount - actualAmount) / expectedAmount) * 100;
        
        if (actualSlippage > originalQuote.maxSlippage) {
            return {
                isValid: false,
                reason: `Slippage ${actualSlippage.toFixed(2)}% exceeds maximum ${originalQuote.maxSlippage}%`
            };
        }
        
        console.log('✅ Order execution validated:', {
            expectedAmount,
            actualAmount,
            slippage: actualSlippage.toFixed(2) + '%',
            status: 'VALID'
        });
        
        return { isValid: true };
    }
    
    /**
     * Create price oracle signature for additional security
     * In production, this would come from a trusted price oracle
     */
    async createPriceAttestation(
        quote: CrossEcosystemQuote,
        oraclePrivateKey: string
    ): Promise<string> {
        
        const priceData = {
            srcTokenSymbol: quote.srcToken.symbol,
            dstTokenSymbol: quote.dstToken.symbol,
            srcTokenUsdPrice: quote.srcTokenUsdPrice,
            dstTokenUsdPrice: quote.dstTokenUsdPrice,
            timestamp: Date.now(),
            quoteId: quote.quoteId
        };
        
        const message = ethers.keccak256(
            ethers.toUtf8Bytes(JSON.stringify(priceData))
        );
        
        const wallet = new ethers.Wallet(oraclePrivateKey);
        const signature = await wallet.signMessage(ethers.getBytes(message));
        
        console.log('📊 Price attestation created by oracle');
        
        return signature;
    }
    
    /**
     * MEV Protection: Add random delay to prevent timing attacks
     */
    async addMEVProtection(): Promise<number> {
        // Random delay between 100ms - 2000ms
        const delay = Math.floor(Math.random() * 1900) + 100;
        
        console.log(`🛡️ MEV protection: Adding ${delay}ms delay`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return delay;
    }
    
    /**
     * Generate secure order ID that can't be predicted
     */
    generateSecureOrderId(userAddress: string): string {
        const timestamp = Date.now();
        const random = ethers.randomBytes(16);
        const userHash = ethers.keccak256(ethers.toUtf8Bytes(userAddress));
        
        return ethers.keccak256(
            ethers.concat([
                ethers.toBeHex(timestamp, 8),
                random,
                userHash.slice(0, 18) // First 16 bytes
            ])
        );
    }
    
    /**
     * Check if order is safe to execute (no suspicious activity)
     */
    checkOrderSafety(quote: CrossEcosystemQuote): {
        isSafe: boolean;
        warnings: string[];
    } {
        const warnings: string[] = [];
        
        // Check 1: Price impact too high
        if (quote.priceImpact > 2) {
            warnings.push(`High price impact: ${quote.priceImpact}%`);
        }
        
        // Check 2: Fees too high relative to amount
        const feePercentage = (parseFloat(quote.totalFeesUsd) / parseFloat(quote.srcAmountUsd)) * 100;
        if (feePercentage > 5) {
            warnings.push(`High fees: ${feePercentage.toFixed(1)}% of transaction`);
        }
        
        // Check 3: Very short quote validity
        const timeRemaining = quote.validUntil - Date.now();
        if (timeRemaining < 30000) { // Less than 30 seconds
            warnings.push('Quote expires very soon');
        }
        
        const isSafe = warnings.length === 0;
        
        if (!isSafe) {
            console.log('⚠️ Order safety warnings:', warnings);
        }
        
        return { isSafe, warnings };
    }
}

// Export singleton instance
export const secureOrderService = new SecureOrderService(); 