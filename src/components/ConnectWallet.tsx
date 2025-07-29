import { useState } from 'react';
import { connectWallet } from '../lib/wallet';

interface ConnectWalletProps {
  onConnect: (signer: any, address: string) => void;
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const [error, setError] = useState<string>('');

  const handleConnect = async () => {
    try {
      const { signer, address } = await connectWallet();
      onConnect(signer, address);
    } catch (err) {
      setError('Failed to connect wallet');
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleConnect}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Connect Wallet
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}