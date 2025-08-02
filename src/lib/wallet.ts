import { ethers } from 'ethers';
import { CrossChainOrder } from '@1inch/cross-chain-sdk';
import { buildOrderTypedData, LimitOrderV4Struct } from '@1inch/limit-order-sdk';
import { config } from './config';

export async function connectWallet(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
}> {
  if (!window.ethereum) throw new Error('No wallet detected');
  
  // Use modern MetaMask API instead of legacy send method
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

function build(order: CrossChainOrder): LimitOrderV4Struct {
  return {
      maker: order.maker.toString(),
      makerAsset: order.makerAsset.toString(),
      takerAsset: order.takerAsset.toString(),
      makerTraits: (0n).toString(),
      salt: order.salt.toString(),
      makingAmount: order.makingAmount.toString(),
      takingAmount: order.takingAmount.toString(),
      receiver: order.receiver.toString()
  }
}

export async function signOrder(
  signer: ethers.Signer,
  chainId: number,
  order: CrossChainOrder
): Promise<string> {
  try {


    const typedData = buildOrderTypedData (
      chainId,
      config.LOPAddress,
      'United LOP',
      '1',
      build(order)
    )
 
    const typedData2 = order.getTypedData(chainId) as any;
    
    // 🔧 WORKAROUND: Fix the corrupted takerAsset
    if (typedData.message) {
      console.log('🔧 Fixing SDK bug - correcting takerAsset');
      console.log('  Before fix:', typedData.message.takerAsset);
      typedData.message.takerAsset = order.takerAsset.toString();
      console.log('  After fix:', typedData.message.takerAsset);
    }
    
    // Try using the order's built-in signing method first
    if (typeof (order as any).sign === 'function') {
      return await (order as any).sign(signer);
    }
    
    // Fallback to manual EIP-712 signing
    const domain = typedData.domain;
    const types = typedData.types;
    const value = typedData.message || typedData;
    
    // Remove EIP712Domain from types if it exists
    const cleanTypes = { ...types };
    delete cleanTypes.EIP712Domain;
    
    return await signer.signTypedData(domain, cleanTypes, value);
  } catch (error: unknown) {
    console.error('signOrder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to sign order: ${errorMessage}`);
  }
}