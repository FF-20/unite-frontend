// lib/wallet-utils.ts
import { ethers } from 'ethers';

export interface WalletConnection {
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
  chainId: number;
}

export class WalletUtils {
  static isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  static async connectWallet(): Promise<WalletConnection> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      // Check if already connected to avoid duplicate requests
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        return { provider, signer, address, chainId: Number(network.chainId) };
      }

      // Request accounts only if not connected
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      return {
        provider,
        signer,
        address,
        chainId: Number(network.chainId),
      };
    } catch (error: any) {
      if (error.code === -32002) {
        throw new Error('MetaMask request already pending. Please check MetaMask and try again.');
      }
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  static async checkConnection(): Promise<WalletConnection | null> {
    if (!this.isMetaMaskInstalled()) {
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const accounts = await provider.listAccounts();

      if (accounts.length === 0) {
        return null;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      return {
        provider,
        signer,
        address,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      return null;
    }
  }

  static async switchChain(targetChainId: number): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await this.addChain(targetChainId);
      } else {
        throw new Error(`Failed to switch chain: ${error.message}`);
      }
    }
  }

  private static async addChain(chainId: number): Promise<void> {
    const chainConfigs: Record<number, any> = {
      11155111: {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: {
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: ['https://sepolia.etherscan.io'],
      },
    };

    const config = chainConfigs[chainId];
    if (!config) {
      throw new Error(`Chain ${chainId} is not supported`);
    }

    await window.ethereum!.request({
      method: 'wallet_addEthereumChain',
      params: [config],
    });
  }

  static formatAddress(address: string, length: number = 4): string {
    if (!address) return '';
    return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
  }
}