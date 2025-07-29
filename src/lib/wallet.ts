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
  const typedData = order.getTypedData(chainId);
  // Assuming getTypedData returns { domain, types, value } for EIP-712
  const { domain, types, value } = typedData as any; // Adjust based on SDK's actual return type
  return signer.signTypedData(domain, types, value);
}