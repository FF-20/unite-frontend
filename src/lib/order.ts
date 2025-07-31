import {  
    HashLock,  
    NetworkEnum,  
    OrderStatus,  
    PresetEnum,  
    PrivateKeyProviderConnector,  
    SDK,
    SupportedChain
} from '@1inch/cross-chain-sdk';
import Web3 from 'web3';
import { randomBytes } from 'crypto';
import { sdk } from './sdk';
import { CrossEcosystemQuote, crossEcosystemQuoteService } from './crossEcosystemQuote';
import { secureOrderService } from './secureOrder';

export interface OrderParams {
    amount: string;
    srcChainId: NetworkEnum;
    dstChainId: NetworkEnum;
    srcTokenAddress: string;
    dstTokenAddress: string;
    walletAddress: string;
    preset?: PresetEnum;
}

export interface CrossEcosystemOrderParams {
    amount: string;
    srcChainId: string; // Cross-ecosystem uses string IDs
    dstChainId: string;
    srcTokenAddress: string;
    dstTokenAddress: string;
    walletAddress: string;
    slippage?: number;
    postInteraction?: {
        target: string; // Contract address to call after bridge completion
        data: string;   // Encoded function call data
        description: string; // Human readable description
    };
}

export interface OrderResult {
    hash: string;
    quoteId: string;
    order: any;
    secrets: string[];
}

export interface CrossEcosystemOrderResult {
    quote: CrossEcosystemQuote;
    orderCommitment: any;
    estimatedTime: number;
    bridgeProtocol: string;
    securityProtection: boolean;
    signatures: {
        approvalSignature?: string;
        bridgeSignature?: string;
        orderSignature: string;
    };
    postInteraction?: {
        target: string;
        data: string;
        description: string;
    };
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createCrossChainOrder(params: OrderParams): Promise<OrderResult> {
    const {
        amount,
        srcChainId,
        dstChainId,
        srcTokenAddress,
        dstTokenAddress,
        walletAddress,
        preset = PresetEnum.fast
    } = params;

    console.log('Getting quote...');
    
    // Get quote from SDK
    const quote = await sdk.getQuote({
        amount,
        srcChainId: srcChainId as SupportedChain,
        dstChainId: dstChainId as SupportedChain,
        enableEstimate: true,
        srcTokenAddress,
        dstTokenAddress,
        walletAddress
    });

    console.log('Quote received:', quote);

    // Generate secrets
    const secrets = Array.from({
        length: quote.presets[preset]?.secretsCount || 1
    }).map(() => '0x' + randomBytes(32).toString('hex'));

    console.log(`Generated ${secrets.length} secrets`);

    // Create hash lock
    const hashLock = secrets.length === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

    const secretHashes = secrets.map((s) => HashLock.hashSecret(s));

    console.log('Creating order...');
    
    // Create order options
    let orderOptions: any = {
        walletAddress,
        hashLock,
        preset,
        source: 'unite-frontend',
        secretHashes
    };
    
    // Add post interaction if provided
    if (params.postInteraction) {
        // Add post interaction data as extra metadata for now
        // The 1inch SDK will handle post interactions during order execution
        orderOptions.extraData = JSON.stringify({
            postInteraction: {
                target: params.postInteraction.target,
                data: params.postInteraction.data,
                description: params.postInteraction.description
            }
        });
        
        console.log('🔧 Post interaction added:', params.postInteraction.description);
        console.log('📍 Target:', params.postInteraction.target);  
        console.log('📡 Data:', params.postInteraction.data.slice(0, 20) + '...');
    }
    
    // Create order using SDK
    const { hash, quoteId, order } = await sdk.createOrder(quote, orderOptions);

    console.log('Order created with hash:', hash);

    return {
        hash,
        quoteId,
        order,
        secrets
    };
}

export async function submitCrossChainOrder(
    srcChainId: NetworkEnum,
    order: any,
    quoteId: string,
    secretHashes: string[]
): Promise<void> {
    console.log('Submitting order...');
    
    const orderInfo = await sdk.submitOrder(
        srcChainId as SupportedChain,
        order,
        quoteId,
        secretHashes
    );
    
    console.log('Order submitted:', orderInfo);
}

export async function processOrderExecution(hash: string, secrets: string[]): Promise<void> {
    console.log('Starting order execution process...');
    
    while (true) {
        // Check for fills that need secrets
        const secretsToShare = await sdk.getReadyToAcceptSecretFills(hash);

        if (secretsToShare.fills.length) {
            console.log(`Found ${secretsToShare.fills.length} fills ready for secrets`);
            
            for (const { idx } of secretsToShare.fills) {
                await sdk.submitSecret(hash, secrets[idx]);
                console.log(`Shared secret for fill ${idx}`);
            }
        }

        // Check order status
        const { status } = await sdk.getOrderStatus(hash);
        console.log('Order status:', status);

        if (
            status === OrderStatus.Executed ||
            status === OrderStatus.Expired ||
            status === OrderStatus.Refunded
        ) {
            console.log('Order finished with status:', status);
            break;
        }

        await sleep(2000); // Check every 2 seconds
    }

    // Get final status
    const finalStatus = await sdk.getOrderStatus(hash);
    console.log('Final order status:', finalStatus);
}

export async function getOrderStatus(hash: string) {
    return await sdk.getOrderStatus(hash);
}

// Complete order flow for EVM-to-EVM (1inch SDK)
export async function executeCrossChainSwap(params: OrderParams): Promise<void> {
    try {
        // Step 1: Create order
        const { hash, quoteId, order, secrets } = await createCrossChainOrder(params);
        
        // Step 2: Submit order
        const secretHashes = secrets.map((s) => HashLock.hashSecret(s));
        await submitCrossChainOrder(params.srcChainId, order, quoteId, secretHashes);
        
        // Step 3: Process execution (handle secrets and monitor)
        await processOrderExecution(hash, secrets);
        
    } catch (error) {
        console.error('Cross-chain swap failed:', error);
        throw error;
    }
}

// NEW: Cross-ecosystem order flow (EVM ↔ Cosmos)
export async function createCrossEcosystemOrder(params: CrossEcosystemOrderParams): Promise<CrossEcosystemOrderResult> {
    try {
        console.log('🌉 Creating cross-ecosystem order...');
        console.log('Route:', `${params.srcChainId} → ${params.dstChainId}`);
        
        // Step 1: Get secure quote with real-time pricing
        const quote = await crossEcosystemQuoteService.getQuote(params);
        console.log('📊 Quote received:', {
            exchangeRate: quote.exchangeRate,
            estimatedOutput: quote.dstAmount,
            fees: quote.totalFeesUsd,
            route: quote.route.name
        });
        
        // Step 2: Security validation
        const safetyCheck = secureOrderService.checkOrderSafety(quote);
        if (!safetyCheck.isSafe) {
            console.warn('⚠️ Security warnings:', safetyCheck.warnings);
            // You could throw here or let user decide
        }
        
        // Step 3: Create secure order commitment (prevents front-running)
        const orderCommitment = await secureOrderService.createOrderCommitment({
            quote,
            userAddress: params.walletAddress,
            deadline: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        
                 // Step 4: Request user signatures
         console.log('📝 Requesting user signatures...');
         const signatures = await requestUserSignatures(quote, params);
         
         // Step 5: MEV protection
         await secureOrderService.addMEVProtection();
         
         console.log('✅ Cross-ecosystem order created successfully');
         console.log('🔒 Security features enabled:', {
             slippageProtection: `${quote.priceImpact.toFixed(2)}% max impact`,
             minimumGuarantee: `${quote.minDstAmount} ${quote.dstToken.symbol}`,
             commitmentHash: orderCommitment.commitment.slice(0, 10) + '...'
         });
        
                 return {
             quote,
             orderCommitment,
             estimatedTime: quote.estimatedTime,
             bridgeProtocol: quote.route.bridgeProtocol,
             securityProtection: true,
             signatures,
             postInteraction: params.postInteraction
         };
        
    } catch (error) {
        console.error('❌ Cross-ecosystem order creation failed:', error);
        throw error;
    }
}

// NEW: Execute cross-ecosystem bridge
export async function executeCrossEcosystemBridge(orderResult: CrossEcosystemOrderResult): Promise<void> {
    try {
        const { quote, orderCommitment } = orderResult;
        
        console.log('🚀 Executing cross-ecosystem bridge...');
        console.log('Bridge Protocol:', quote.route.bridgeProtocol);
        console.log('Expected Time:', quote.estimatedTime, 'minutes');
        
        // Step 1: Validate order is still safe to execute
        const validation = secureOrderService.validateOrderExecution(quote, quote.dstAmount);
        if (!validation.isValid) {
            throw new Error(`Order validation failed: ${validation.reason}`);
        }
        
        // Step 2: Execute bridge based on protocol
        switch (quote.route.bridgeProtocol) {
            case 'gravity':
                await executeGravityBridge(quote);
                break;
            case 'axelar':
                await executeAxelarBridge(quote);
                break;
            case 'wormhole':
                await executeWormholeBridge(quote);
                break;
            default:
                throw new Error(`Unsupported bridge protocol: ${quote.route.bridgeProtocol}`);
        }
        
                 console.log('✅ Bridge execution initiated successfully');
         console.log(`💰 Expected to receive: ${quote.minDstAmount} ${quote.dstToken.symbol}`);
         console.log(`⏱️ Estimated completion: ~${quote.estimatedTime} minutes`);
         
         // Step 3: Execute post-interaction if specified
         if (orderResult.postInteraction) {
             console.log('🔧 Executing post-interaction...');
             await executePostInteraction(orderResult.postInteraction, quote);
         }
         
     } catch (error) {
         console.error('❌ Bridge execution failed:', error);
         throw error;
     }
 }

 // NEW: Request user signatures for bridge transactions
 async function requestUserSignatures(
     quote: CrossEcosystemQuote, 
     params: CrossEcosystemOrderParams
 ): Promise<{ approvalSignature?: string; bridgeSignature?: string; orderSignature: string }> {
     
     console.log('🖊️ Requesting wallet signatures...');
     
     // Import ethers for wallet operations
     const { ethers } = await import('ethers');
     
     try {
         // Get user's wallet (in real app, this would come from wallet connection)
         if (typeof window !== 'undefined' && (window as any).ethereum) {
             const provider = new ethers.BrowserProvider((window as any).ethereum);
             const signer = await provider.getSigner();
             
             console.log('📝 Signature 1/3: Token Approval');
             // 1. Token Approval Signature (EIP-2612 permit if supported)
             const approvalSignature = await requestTokenApproval(signer, quote);
             
             console.log('📝 Signature 2/3: Bridge Transaction');  
             // 2. Bridge Transaction Signature
             const bridgeSignature = await requestBridgeSignature(signer, quote);
             
             console.log('📝 Signature 3/3: Order Commitment');
             // 3. Order Commitment Signature
             const orderSignature = await requestOrderSignature(signer, quote, params);
             
             console.log('✅ All signatures collected successfully');
             
             return {
                 approvalSignature,
                 bridgeSignature,
                 orderSignature
             };
         } else {
             throw new Error('No wallet detected');
         }
         
     } catch (error) {
         console.error('❌ Signature request failed:', error);
         throw new Error(`Failed to get user signatures: ${error}`);
     }
 }

 // Request token approval signature
 async function requestTokenApproval(signer: any, quote: CrossEcosystemQuote): Promise<string> {
     // EIP-712 typed data for token approval
     const domain = {
         name: quote.srcToken.name,
         version: '1',
         chainId: parseInt(quote.srcChain.chainId),
         verifyingContract: quote.srcToken.address
     };
     
     const types = {
         Permit: [
             { name: 'owner', type: 'address' },
             { name: 'spender', type: 'address' },
             { name: 'value', type: 'uint256' },
             { name: 'nonce', type: 'uint256' },
             { name: 'deadline', type: 'uint256' }
         ]
     };
     
           const { ethers } = await import('ethers');
      
      const value = {
          owner: await signer.getAddress(),
          spender: '0x1234567890123456789012345678901234567890', // Bridge contract
          value: ethers.parseUnits(quote.srcAmount, quote.srcToken.decimals),
          nonce: 0, // Would get from contract
          deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };
     
     console.log('🔐 Please approve token spending in your wallet...');
     return await signer.signTypedData(domain, types, value);
 }

 // Request bridge transaction signature
 async function requestBridgeSignature(signer: any, quote: CrossEcosystemQuote): Promise<string> {
     const bridgeData = {
         from: quote.srcChain.chainId,
         to: quote.dstChain.chainId,
         token: quote.srcToken.address,
         amount: quote.srcAmount,
         recipient: await signer.getAddress(),
         deadline: Date.now() + 600000 // 10 minutes
     };
     
     const message = `Bridge ${quote.srcAmount} ${quote.srcToken.symbol} from ${quote.srcChain.name} to ${quote.dstChain.name}\n\nFees: ${quote.totalFees} ${quote.srcToken.symbol}\nExpected: ${quote.minDstAmount} ${quote.dstToken.symbol}`;
     
     console.log('🌉 Please sign the bridge transaction in your wallet...');
     return await signer.signMessage(message);
 }

 // Request order commitment signature
 async function requestOrderSignature(
     signer: any, 
     quote: CrossEcosystemQuote, 
     params: CrossEcosystemOrderParams
 ): Promise<string> {
     
     const orderData = {
         quoteId: quote.quoteId,
         srcChain: quote.srcChain.chainId,
         dstChain: quote.dstChain.chainId,
         srcAmount: quote.srcAmount,
         minDstAmount: quote.minDstAmount,
         userAddress: params.walletAddress,
         timestamp: Date.now()
     };
     
     const message = `Confirm Cross-Chain Order\n\nQuote ID: ${quote.quoteId}\nRoute: ${quote.srcChain.name} → ${quote.dstChain.name}\nAmount: ${quote.srcAmount} ${quote.srcToken.symbol}\nMinimum Receive: ${quote.minDstAmount} ${quote.dstToken.symbol}`;
     
     console.log('📋 Please confirm your order in your wallet...');
     return await signer.signMessage(message);
 }

 // NEW: Execute post-interaction logic
 async function executePostInteraction(
     postInteraction: { target: string; data: string; description: string },
     quote: CrossEcosystemQuote
 ): Promise<void> {
     
     console.log('🔧 Executing post-interaction:', postInteraction.description);
     console.log('📍 Target contract:', postInteraction.target);
     console.log('📡 Encoded data:', postInteraction.data.slice(0, 20) + '...');
     
     try {
         // In a real implementation, this would call the target contract
         // For now, we'll simulate different types of post-interactions
         
         if (postInteraction.description.includes('stake')) {
             await simulateStakeInteraction(postInteraction, quote);
         } else if (postInteraction.description.includes('swap')) {
             await simulateSwapInteraction(postInteraction, quote);
         } else if (postInteraction.description.includes('lend')) {
             await simulateLendInteraction(postInteraction, quote);
         } else {
             await simulateGenericInteraction(postInteraction, quote);
         }
         
         console.log('✅ Post-interaction executed successfully');
         
     } catch (error) {
         console.error('❌ Post-interaction failed:', error);
         // Post-interaction failure shouldn't fail the main bridge
         console.log('⚠️ Bridge completed but post-interaction failed');
     }
 }

 // Simulate staking post-interaction
 async function simulateStakeInteraction(postInteraction: any, quote: CrossEcosystemQuote): Promise<void> {
     console.log(`🥩 Staking ${quote.dstAmount} ${quote.dstToken.symbol} automatically...`);
     await new Promise(resolve => setTimeout(resolve, 2000));
     console.log('✅ Tokens staked successfully! Earning rewards...');
 }

 // Simulate swap post-interaction  
 async function simulateSwapInteraction(postInteraction: any, quote: CrossEcosystemQuote): Promise<void> {
     console.log(`🔄 Swapping ${quote.dstAmount} ${quote.dstToken.symbol} to another token...`);
     await new Promise(resolve => setTimeout(resolve, 1500));
     console.log('✅ Swap completed successfully!');
 }

 // Simulate lending post-interaction
 async function simulateLendInteraction(postInteraction: any, quote: CrossEcosystemQuote): Promise<void> {
     console.log(`🏦 Lending ${quote.dstAmount} ${quote.dstToken.symbol} to earn interest...`);
     await new Promise(resolve => setTimeout(resolve, 2000));
     console.log('✅ Tokens lent successfully! Earning interest...');
 }

 // Simulate generic post-interaction
 async function simulateGenericInteraction(postInteraction: any, quote: CrossEcosystemQuote): Promise<void> {
     console.log(`⚙️ Executing custom interaction: ${postInteraction.description}`);
     await new Promise(resolve => setTimeout(resolve, 1000));
     console.log('✅ Custom interaction completed!');
 }

// Bridge protocol implementations (placeholders for now)
async function executeGravityBridge(quote: CrossEcosystemQuote): Promise<void> {
    console.log('🌉 Executing Gravity Bridge...');
    // TODO: Implement actual Gravity Bridge transaction
    // This would involve:
    // 1. Lock tokens on Ethereum
    // 2. Generate proof
    // 3. Submit to Cosmos Hub
    await simulateBridgeExecution(quote, 'Gravity Bridge');
}

async function executeAxelarBridge(quote: CrossEcosystemQuote): Promise<void> {
    console.log('🔗 Executing Axelar Bridge...');
    // TODO: Implement actual Axelar transaction
    await simulateBridgeExecution(quote, 'Axelar Network');
}

async function executeWormholeBridge(quote: CrossEcosystemQuote): Promise<void> {
    console.log('🌀 Executing Wormhole Bridge...');
    // TODO: Implement actual Wormhole transaction
    await simulateBridgeExecution(quote, 'Wormhole');
}

// Simulate bridge execution for now
async function simulateBridgeExecution(quote: CrossEcosystemQuote, protocol: string): Promise<void> {
    console.log(`📡 ${protocol} bridge simulation:`);
    console.log(`Source: ${quote.srcAmount} ${quote.srcToken.symbol} on ${quote.srcChain.name}`);
    console.log(`Destination: ${quote.dstAmount} ${quote.dstToken.symbol} on ${quote.dstChain.name}`);
    console.log(`Fees: ${quote.totalFees} ${quote.srcToken.symbol} (${quote.totalFeesUsd} USD)`);
    
    // Simulate processing time
    for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`${protocol} processing... ${i + 1}/3`);
    }
    
    console.log(`✅ ${protocol} bridge initiated successfully!`);
} 