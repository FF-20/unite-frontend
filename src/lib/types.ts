// lib/types.ts
export interface QuoteParams {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  walletAddress: string;
  enableEstimate?: boolean;
}

export interface CreateOrderParams {
  walletAddress: string;
  hashLock: string;
  preset: 'fast' | 'medium' | 'slow';
  source: string;
  secretHashes: string[];
}

export interface SwapOrder {
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  salt: string;
  hashLock: string;
  timelocks: {
    srcWithdrawal: number;
    srcPublicWithdrawal: number;
    srcCancellation: number;
    srcPublicCancellation: number;
    dstWithdrawal: number;
    dstPublicWithdrawal: number;
    dstCancellation: number;
  };
}

export interface DeployedContracts {
  escrowFactory: string;
  escrowSrcImplementation: string;
  escrowDstImplementation: string;
  limitOrderProtocol: string;
  mockToken?: string;
  resolver?: string;
}

export interface SwapResult {
  orderHash: string;
  srcEscrowAddress?: string;
  dstEscrowAddress?: string;
  txHash: string;
  secrets: string[];
}

export interface Quote {
  srcAmount: string;
  dstAmount: string;
  presets: {
    fast: { secretsCount: number };
    medium: { secretsCount: number };
    slow: { secretsCount: number };
  };
  srcChainId: number;
  dstChainId: number;
}