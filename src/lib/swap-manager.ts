import { ethers, BigNumberish } from 'ethers';
import {
    QuoteParams,
    CreateOrderParams,
    SwapOrder,
    DeployedContracts,
    SwapResult,
    Quote
} from './types';
import { HashLockUtils } from './hash-lock-utils';
import {
    ESCROW_FACTORY_ABI,
    LIMIT_ORDER_PROTOCOL_ABI,
    DST_ESCROW_ABI,
    SRC_ESCROW_ABI,
    DEFAULT_TIMELOCKS
} from './constants';

type MakerTraits = BigNumberish;
type TakerTraits = BigNumberish;
function createMakerTraits(): MakerTraits {
    let traits = BigInt(0);
    traits |= BigInt(1) << BigInt(255); // No partial fills
    traits |= BigInt(1) << BigInt(254); // Allow multiple fills
    traits |= BigInt(1) << BigInt(251); // Post-interaction call
    return traits;
}
export function createTakerTraits(threshold: BigNumberish = 1000): TakerTraits {
  let traits = BigInt(0);
  traits |= BigInt(1) << BigInt(254); // Unwrap WETH
  traits |= BigInt(threshold); // Threshold amount
  return traits;
}

export class CrossChainSwapManager {
    private provider: ethers.Provider;
    private signer: ethers.Signer;
    private contracts: DeployedContracts;
    private chainId: number;

    constructor(
        provider: ethers.Provider,
        signer: ethers.Signer,
        contracts: DeployedContracts,
        chainId: number = 11155111
    ) {
        this.provider = provider;
        this.signer = signer;
        this.contracts = contracts;
        this.chainId = chainId;
    }

    /**
     * Get quote for cross-chain swap
     */
    async getQuote(params: QuoteParams): Promise<Quote> {
        // Mock implementation - replace with actual price calculation
        console.log('Getting quote for:', params);

        return {
            srcAmount: params.amount,
            dstAmount: ethers.parseUnits('0.95', 18).toString(),
            presets: {
                fast: { secretsCount: 4 },
                medium: { secretsCount: 8 },
                slow: { secretsCount: 16 }
            },
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId
        };
    }

    /**
     * Create cross-chain swap order
     */
    async createOrder(quote: Quote, params: CreateOrderParams): Promise<{
        hash: string;
        order: SwapOrder;
        secrets: string[];
    }> {
        const secrets = HashLockUtils.generateSecrets(quote.presets[params.preset].secretsCount);
        const hashLock = HashLockUtils.createHashLock(secrets);

        const salt = ethers.keccak256(
            ethers.solidityPacked(
                ['address', 'uint256', 'bytes32'],
                [params.walletAddress, Date.now(), ethers.randomBytes(32)]
            )
        );

        const order: SwapOrder = {
            maker: params.walletAddress,
            receiver: params.walletAddress,
            makerAsset: '0x0000000000000000000000000000000000000000',
            takerAsset: '0x0000000000000000000000000000000000000001',
            makingAmount: quote.srcAmount,
            takingAmount: quote.dstAmount,
            salt,
            hashLock,
            timelocks: DEFAULT_TIMELOCKS,
            // token: params.
        };

        const orderHash = await this.getOrderHash(order);

        return { hash: orderHash, order, secrets };
    }



    /**
     * Execute complete cross-chain swap
     */
    async executeSwap(quote: Quote, params: CreateOrderParams): Promise<any> {
        try {
            console.log('Starting cross-chain swap execution...');

            // 1. Create order
            const { hash, order, secrets } = await this.createOrder(quote, params);
            console.log('Order created with hash:', hash);

            // 2. Sign order
            const signature = await this.signOrder(order);
            console.log('Order signed');
            console.log(signature)
            console.log(order);

            const sig = ethers.Signature.from(signature);
            console.log(sig);

            const vs = ethers.concat([
                ethers.zeroPadValue(ethers.toBeHex(sig.v), 32), // v as 32-byte hex
                sig.s // s is already 32-byte hex
            ]);

            console.log(vs)

            return {
                immutables: {
                    orderHash: order,
                    hashlock: order.hashLock,
                    maker: order.maker,
                    taker: order.takerAsset,
                    token: "", 
                    amount: "",
                    safetyDeposit: "",
                    timelocks: order.timelocks
                },
                order: {
                    salt: order.salt,
                    maker: order.maker,
                    receiver: order.receiver,
                    makerAsset: order.makerAsset,
                    takerAsset: order.takerAsset,
                    makingAmount: order.makingAmount,
                    takingAmount: order.takingAmount,
                    makerTraits: createMakerTraits(),
                },
                r: sig.r,
                vs,
                takerTraits: null, // Assigned by taker later.
                args: "0x",
            }

            // 3. Broadcast to Relayer.

            // 3. Submit to Limit Order Protocol
            // const { txHash, srcEscrowAddress } = await this.submitOrderToLimitProtocol(order, signature);
            // console.log('Order submitted, SrcEscrow deployed at:', srcEscrowAddress);

            // // 4. Deploy destination escrow
            // const dstEscrowAddress = await this.deployDstEscrow(hash);
            // console.log('DstEscrow deployed at:', dstEscrowAddress);

            // // 5. Start secret monitoring (runs in background)
            // this.monitorAndSubmitSecrets(hash, secrets).catch(console.error);

            return {
                orderHash: hash,
                srcEscrowAddress: "",
                dstEscrowAddress: "",
                txHash: "",
                secrets
            };

        } catch (error) {
            console.error('Swap execution failed:', error);
            throw error;
        }
    }

    private async submitOrderToLimitProtocol(
        order: SwapOrder,
        signature: string
    ): Promise<{ txHash: string; srcEscrowAddress: string }> {
        const limitOrderContract = new ethers.Contract(
            this.contracts.limitOrderProtocol,
            LIMIT_ORDER_PROTOCOL_ABI,
            this.signer
        );

        // v4: fillOrderArgs signature
        const takerTraits = 0; // 0 == default
        const extraArgs = "0x"; // empty extension data
        const makingAmount = order.makingAmount;

        const tx = await limitOrderContract.fillOrderArgs(
            order,          // order
            signature,      // bytes
            makingAmount,   // amount to fill
            takerTraits,    // uint256
            extraArgs       // bytes
        );
        console.log(tx);

        const receipt = await tx.wait();
        const srcEscrowAddress = this.extractEscrowAddressFromReceipt(receipt);
        return { txHash: tx.hash, srcEscrowAddress };
    }

    /**
     * Deploy destination escrow
     */
    private async deployDstEscrow(orderHash: string): Promise<string> {
        const escrowFactory = new ethers.Contract(
            this.contracts.escrowFactory,
            DST_ESCROW_ABI,
            this.signer
        );

        console.log('Deploying destination escrow...');
        const tx = await escrowFactory.createEscrowDst(orderHash);
        const receipt = await tx.wait();

        return this.extractEscrowAddressFromReceipt(receipt);
    }

    /**
     * Monitor escrows and submit secrets
     */
    private async monitorAndSubmitSecrets(orderHash: string, secrets: string[]): Promise<void> {
        console.log('Starting secret monitoring for order:', orderHash);

        let completed = false;
        while (!completed) {
            try {
                const readyFills = await this.getReadyToAcceptSecretFills(orderHash);

                if (readyFills.length > 0) {
                    for (const fillIndex of readyFills) {
                        await this.submitSecret(orderHash, secrets[fillIndex], fillIndex);
                        console.log(`Submitted secret for fill index: ${fillIndex}`);
                    }
                }

                const status = await this.getOrderStatus(orderHash);
                if (['executed', 'expired', 'refunded'].includes(status)) {
                    completed = true;
                    console.log(`Order completed with status: ${status}`);
                }

                if (!completed) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.error('Error monitoring secrets:', error);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    /**
     * Sign order using EIP-712
     */
    private async signOrder(order: SwapOrder): Promise<string> {
        const domain = {
            name: 'Limit Order Protocol',
            version: '3',
            chainId: this.chainId,
            verifyingContract: this.contracts.limitOrderProtocol
        };

        const types = {
            Order: [
                { name: 'maker', type: 'address' },
                { name: 'receiver', type: 'address' },
                { name: 'makerAsset', type: 'address' },
                { name: 'takerAsset', type: 'address' },
                { name: 'makingAmount', type: 'uint256' },
                { name: 'takingAmount', type: 'uint256' },
                { name: 'salt', type: 'bytes32' },
                { name: 'token', type: 'address'}
            ]
        };

        return await this.signer.signTypedData(domain, types, order);
    }

    /**
     * Get order hash
     */
    private async getOrderHash(order: SwapOrder) {
        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'address', 'address', 'uint256', 'uint256', 'bytes32', 'bytes32'],
            [
                order.maker, order.receiver, order.makerAsset, order.takerAsset,
                order.makingAmount, order.takingAmount, order.salt, order.hashLock
            ]
        );

        return ethers.keccak256(encoded);
    }

    /**
     * Extract escrow address from transaction receipt
     */
    private extractEscrowAddressFromReceipt(receipt: any): string {
        // Look for EscrowDeployed events
        console.log("receipt from escrow")
        console.log(receipt)
        for (const log of receipt.logs) {
            // Parse the log to find escrow address
            // This is a simplified version - you'll need to parse actual events
        }
        return '0x1234567890123456789012345678901234567890'; // Placeholder
    }

    /**
     * Get fills ready for secret submission (mock)
     */
    private async getReadyToAcceptSecretFills(orderHash: string): Promise<number[]> {
        // Mock implementation - replace with actual contract queries
        return [];
    }

    /**
     * Submit secret for specific fill
     */
    private async submitSecret(orderHash: string, secret: string, fillIndex: number): Promise<string> {
        console.log(`Submitting secret for order ${orderHash}, fill ${fillIndex}`);
        return ethers.keccak256(ethers.toUtf8Bytes(secret + fillIndex));
    }

    /**
     * Get order status
     */
    private async getOrderStatus(orderHash: string): Promise<string> {
        // Mock implementation - replace with actual contract queries
        return 'pending';
    }
}