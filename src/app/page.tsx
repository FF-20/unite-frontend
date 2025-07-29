'use client';

import { useState } from 'react';
import ConnectWallet from '../components/ConnectWallet';
import OrderForm from '../components/OrderForm';

export default function Home() {
  const [signer, setSigner] = useState<any>(null);
  const [address, setAddress] = useState<string>('');

  const handleConnect = (signer: any, address: string) => {
    setSigner(signer);
    setAddress(address);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Cross-Chain Order App</h1>
      {!signer ? (
        <ConnectWallet onConnect={handleConnect} />
      ) : (
        <div className="w-full max-w-md">
          <p className="mb-4">Connected: {address}</p>
          <OrderForm signer={signer} />
        </div>
      )}
    </main>
  );
}