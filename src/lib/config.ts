export const config = {
  chain: {
    source: {
      chainId: 11155111, // Sepolia
      tokens: {
        WETH: { address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' },
      },
      escrowFactory: '0x718B8f5c8C1A9bd20b8f3cB347b7CD661A7694B1',
    },
    destination: { 
      chainId: 56, // BSC for now. Later somehow change to cosmos address.
      tokens: {
        USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
      },
      escrowFactory: '0x718B8f5c8C1A9bd20b8f3cB347b7CD661A7694B1', // Replace with actual address
    },
  },
  resolverAddress: '0x718B8f5c8C1A9bd20b8f3cB347b7CD661A7694B1', // Replace with actual resolver address
};