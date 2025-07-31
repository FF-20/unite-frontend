import { ethers } from 'ethers';
import { CrossChainOrder } from '@1inch/cross-chain-sdk';

export async function connectWallet(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
}> {
  if (!window.ethereum) throw new Error('No wallet detected');
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

export async function signOrder(
  signer: ethers.Signer,
  chainId: number,
  order: CrossChainOrder
): Promise<string> {
  try {
    const typedData = order.getTypedData(chainId) as any;

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
    const value = typedData.message || typedData.value || typedData;
    
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