import {
    CrossChainOrder,
    HashLock,
    TimeLocks,
    AuctionDetails,
    randBigInt,
    CrossChainOrderInfo,
    EscrowParams,
    Details,
    Extra,
    SDK
} from '@1inch/cross-chain-sdk';
import { ethers, BigNumberish } from 'ethers';
import { OrderParams, CreatedOrder } from './types';
import { config } from './config';
import { signOrder } from './wallet';
import { Address } from '@1inch/limit-order-sdk'

// Validate Ethereum address
const isValidAddress = (address: string, context: string): boolean => {
  if (!address || address === '0' || address === '0x0' || !ethers.isAddress(address)) {
    console.error(`Invalid address in ${context}: ${address}`);
    return false;
  }
  return true;
};

// TODO: Debug this
// export async function createOrder(params: OrderParams, signer: ethers.Signer): Promise<CreatedOrder> {
//     const { srcChainId, dstChainId, makerAsset, takerAsset, makingAmount, takingAmount, allowPartialFills } = params;

//     // Validate all addresses
//     if (!isValidAddress(config.chain.source.escrowFactory, 'source.escrowFactory')) {
//         throw new Error(`Invalid source escrowFactory address: ${config.chain.source.escrowFactory}`);
//     }
//     if (!isValidAddress(config.chain.destination.escrowFactory, 'destination.escrowFactory')) {
//         throw new Error(`Invalid destination escrowFactory address: ${config.chain.destination.escrowFactory}`);
//     }
//     if (!isValidAddress(config.resolverAddress, 'resolverAddress')) {
//         throw new Error(`Invalid resolver address: ${config.resolverAddress}`);
//     }
//     if (!isValidAddress(makerAsset, 'makerAsset')) {
//         throw new Error(`Invalid makerAsset address: ${makerAsset}`);
//     }
//     if (!isValidAddress(takerAsset, 'takerAsset')) {
//         throw new Error(`Invalid takerAsset address: ${takerAsset}`);
//     }

//     const escrowFactory = new Address(config.chain.source.escrowFactory);
//     const secret = ethers.hexlify(ethers.randomBytes(32));
//     const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

//     // Use EvmCrossChainOrderInfo and EvmEscrowParams as fallbacks if needed
//     const orderInfo: CrossChainOrderInfo = {
//         salt: randBigInt(1000n),
//         maker: new Address(await signer.getAddress()),
//         makingAmount: ethers.parseUnits(makingAmount, 6),
//         takingAmount: ethers.parseUnits(takingAmount, 6),
//         makerAsset: new Address(makerAsset),
//         takerAsset: new Address(takerAsset),
//     };

//     const escrowParams: EscrowParams = {
//         hashLock: HashLock.forSingleFill(secret),
//         timeLocks: TimeLocks.new({
//             srcWithdrawal: 3600n,
//             srcPublicWithdrawal: 7200n,
//             srcCancellation: 10800n,
//             srcPublicCancellation: 14400n,
//             dstWithdrawal: 3600n,
//             dstPublicWithdrawal: 7200n,
//             dstCancellation: 10800n,
//         }),
//         srcChainId,
//         dstChainId,
//         srcSafetyDeposit: ethers.parseEther('0.001'),
//         dstSafetyDeposit: ethers.parseEther('0.001'),
//     };

//     // Ensure details matches the SDK's Details type
//     const details: Details = {
//         auction: new AuctionDetails({
//             initialRateBump: 0,
//             points: [],
//             duration: 3600n,
//             startTime: currentTimestamp,
//         }),
//         whitelist: [{ address: new Address(config.resolverAddress), allowFrom: 0n }],
//         resolvingStartTime: 0n, // Explicitly bigint
//     };

//     const extra: Extra = {
//         nonce: randBigInt(2n ** 40n - 1n),
//         allowPartialFills,
//         allowMultipleFills: allowPartialFills,
//     };

//     // Try CrossChainOrder first, fall back to SvmCrossChainOrder
//     const order: CrossChainOrder = CrossChainOrder.new(escrowFactory, orderInfo, escrowParams, details, extra);

//     const signature = await signOrder(signer, srcChainId, order);
//     const orderHash = order.getOrderHash(srcChainId);

//     return { order: { escrowFactory, orderInfo, escrowParams, details, extra }, signature, secret, orderHash };
// }