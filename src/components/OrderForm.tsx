import { useState } from 'react';
// import { createOrder } from '../lib/sdk';
import { config } from '../lib/config';
import { OrderParams } from '../lib/types';

interface OrderFormProps {
  signer: any;
}

export default function OrderForm({ signer }: OrderFormProps) {
  const [formData, setFormData] = useState<OrderParams>({
    srcChainId: config.chain.source.chainId,
    dstChainId: config.chain.destination.chainId,
    makerAsset: config.chain.source.tokens.WETH.address,
    takerAsset: config.chain.destination.tokens.USDC.address,
    makingAmount: '100',
    takingAmount: '99',
    allowPartialFills: false,
  });
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        console.log(formData.srcChainId)
        console.log(formData.makerAsset)
    //   const { order, signature, secret, orderHash } = await createOrder(formData, signer);
    //   setResult(`Order created! Hash: ${orderHash}\nSignature: ${signature}\nSecret: ${secret}`);
      // In a real app, send to relayer here
    } catch (err) {
      setError('Failed to create order');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">Create Cross-Chain Order</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium">Source Chain</label>
        <select
          name="srcChainId"
          value={formData.srcChainId}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value={1}>Ethereum</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Destination Chain</label>
        <select
          name="dstChainId"
          value={formData.dstChainId}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        >
          <option value={56}>BSC</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Maker Asset (WETH)</label>
        <input
          type="text"
          name="makerAsset"
          value={formData.makerAsset}
          readOnly
          className="w-full p-2 border rounded bg-gray-100"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Taker Asset (USDC)</label>
        <input
          type="text"
          name="takerAsset"
          value={formData.takerAsset}
          readOnly
          className="w-full p-2 border rounded bg-gray-100"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Making Amount (WETH)</label>
        <input
          type="number"
          name="makingAmount"
          value={formData.makingAmount}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          step="0.01"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Taking Amount (USDC)</label>
        <input
          type="number"
          name="takingAmount"
          value={formData.takingAmount}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          step="0.01"
        />
      </div>
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="allowPartialFills"
            checked={formData.allowPartialFills}
            onChange={handleInputChange}
            className="mr-2"
          />
          Allow Partial Fills
        </label>
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Create Order
      </button>
      {result && <pre className="mt-4 p-2 bg-gray-100 rounded">{result}</pre>}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </form>
  );
}