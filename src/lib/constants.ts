// lib/constants.ts
import { DeployedContracts } from './types';
import LimitOrderProtocol from '@/abi/LimitOrderProtocol.json'
import EscrowFactory from '@/abi/EscrowFactory.json'
import EscrowDst from '@/abi/EscrowDst.json'
import EscrowSrc from '@/abi/EscrowSrc.json'

// Replace with your actual deployed contract addresses
export const SEPOLIA_CONTRACTS: DeployedContracts = {
  escrowFactory: '0xf58B8c71986d5E412BA260d686D5CE062274bfBd',
  escrowSrcImplementation: '0x39d7835Bb1Da816D1c45a71f2ea0653816B2B6f8',
  escrowDstImplementation: '0xA8b969e4Cb54c8ca2A22cb61cab0B6aE3072B8bC',
  limitOrderProtocol: '0x352f24B4dD631629088Ca1b01531118960F2C3De', // Need to deploy or find this
};

// Contract ABIs - Get these from your compiled contracts
export const ESCROW_FACTORY_ABI = EscrowFactory.abi;
export const LIMIT_ORDER_PROTOCOL_ABI = LimitOrderProtocol.abi;
export const SRC_ESCROW_ABI = EscrowSrc.abi;
export const DST_ESCROW_ABI = EscrowDst.abi;

// Chain configurations
export const SUPPORTED_CHAINS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/56b00fc75c3942b2a5ff00193316aeb4',
    blockExplorer: 'https://sepolia.etherscan.io'
  }
} as const;

// Default timelock values (in seconds)
export const DEFAULT_TIMELOCKS = {
  srcWithdrawal: 3600,        // 1 hour
  srcPublicWithdrawal: 7200,  // 2 hours
  srcCancellation: 10800,     // 3 hours
  srcPublicCancellation: 14400, // 4 hours
  dstWithdrawal: 1800,        // 30 minutes
  dstPublicWithdrawal: 3600,  // 1 hour
  dstCancellation: 5400,      // 1.5 hours
};