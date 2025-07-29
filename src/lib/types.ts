import { BigNumberish } from 'ethers';
import { Address, CrossChainOrderInfo, EscrowParams, Details, Extra } from '@1inch/cross-chain-sdk';

export interface ChainConfig {
  chainId: number;
  tokens: {
    USDC: { address: string };
  };
  escrowFactory: string;
}

export interface OrderParams {
  srcChainId: number;
  dstChainId: number;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  allowPartialFills: boolean;
}

export interface CreatedOrder {
  order: {
    escrowFactory: Address;
    orderInfo: CrossChainOrderInfo;
    escrowParams: EscrowParams;
    details: Details;
    extra: Extra;
  };
  signature: string;
  secret: string;
  orderHash: string;
}