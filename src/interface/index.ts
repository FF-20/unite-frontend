// Types based on the SDK structure
// DEP
interface QuoteParams {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  walletAddress: string;
  enableEstimate?: boolean;
}

interface CreateOrderParams {
  walletAddress: string;
  hashLock: string;
  preset: 'fast' | 'medium' | 'slow';
  source: string;
  secretHashes: string[];
}

interface SwapOrder {
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

interface DeployedContracts {
  baseEscrow: string;
  dstEscrow: string;
  srcEscrow: string;
  escrowFactory?: string;
  limitOrderProtocol?: string;
}