// external-app/src/cross-chain-swap.ts
import { 
    CrossChainOrder, 
    HashLock, 
    TimeLocks,
    EscrowFactoryFacade,
    randBigInt,
    Extra,
    Address, 
    AuctionDetails,
    Details,
    EscrowParams,
    SupportedChain,
    NetworkEnum,
    CrossChainOrderInfo
} from '@1inch/cross-chain-sdk'
import { randomBytes, hexlify } from 'ethers'
import { config } from './config'
import { OrderParams, CreatedOrder } from './types';
import { ethers, BigNumberish } from 'ethers';
import { signOrder } from './wallet';
import { fromBech32 } from '@cosmjs/encoding';

// Custom utility since getRandomBytes32 isn't exported
function getRandomBytes32(): string {
    return hexlify(randomBytes(32))
}

function convertCosmosAssetToAddressWithBech32(cosmosAsset: string): Address {
    try {
        // Check if this is a bech32 address (contains '1' and looks like an address)
        if (cosmosAsset.includes('1') && cosmosAsset.length > 20 && 
            (cosmosAsset.startsWith('cosmos1') || cosmosAsset.startsWith('osmo1') || 
             cosmosAsset.startsWith('juno1') || cosmosAsset.startsWith('akash1'))) {
            
            console.log('Decoding bech32 address:', cosmosAsset);
            const { prefix, data } = fromBech32(cosmosAsset);
            const hexData = Buffer.from(data).toString('hex');
            const decodedAddress = '0x' + hexData.padStart(40, '0');
            console.log('✅ Bech32 decoded to:', decodedAddress);
            return new Address(decodedAddress);
        }
        
        // Handle native token denominations (uatom, uosmo, etc.)
        else if (cosmosAsset.startsWith('u') || cosmosAsset.includes('atom') || 
                 cosmosAsset.includes('osmo') || cosmosAsset.length < 20) {
            
            console.log('Processing native token:', cosmosAsset);
            const hash = ethers.keccak256(ethers.toUtf8Bytes(`cosmos-native-${cosmosAsset}`));
            const nativeAddress = hash.slice(0, 42);
            console.log('✅ Native token address:', nativeAddress);
            console.log('🔍 WETH address for comparison: 0xff99...d6B14'); // Add this line
            return new Address(nativeAddress);
        }
        
        // Handle IBC tokens (ibc/HASH)
        else if (cosmosAsset.startsWith('ibc/')) {
            console.log('Processing IBC token:', cosmosAsset);
            const ibcHash = cosmosAsset.replace('ibc/', '');
            const ibcAddress = '0x' + ibcHash.slice(0, 40);
            console.log('✅ IBC token address:', ibcAddress);
            return new Address(ibcAddress);
        }
        
        // Fallback: treat as generic string
        else {
            console.log('Unknown asset type, using hash fallback:', cosmosAsset);
            const fallbackHash = ethers.keccak256(ethers.toUtf8Bytes(cosmosAsset));
            const fallbackAddress = fallbackHash.slice(0, 42);
            console.log('✅ Fallback address:', fallbackAddress);
            return new Address(fallbackAddress);
        }
        
    } catch (error) {
        console.error('Asset conversion failed for:', cosmosAsset, error);
        // Ultimate fallback
        const fallbackHash = ethers.keccak256(ethers.toUtf8Bytes(`cosmos-fallback-${cosmosAsset}`));
        const fallbackAddress = fallbackHash.slice(0, 42);
        console.log('🔄 Using ultimate fallback address:', fallbackAddress);
        return new Address(fallbackAddress);
    }
}

// Validate Ethereum address
const isValidAddress = (address: string, context: string): boolean => {
    if (!address || address === '0' || address === '0x0' || !ethers.isAddress(address)) {
      console.error(`Invalid address in ${context}: ${address}`);
      return false;
    }
    return true;
  };

export async function buildCustomOrder(params: OrderParams, signer: ethers.Signer) {

    const { srcChainId, dstChainId, makerAsset, takerAsset, makingAmount, takingAmount, allowPartialFills } = params;

    console.log(takerAsset)

    // Validate all addresses
    if (!isValidAddress(config.chain.source.escrowFactory, 'source.escrowFactory')) {
        throw new Error(`Invalid source escrowFactory address: ${config.chain.source.escrowFactory}`);
    }
    if (!isValidAddress(config.chain.destination.escrowFactory, 'destination.escrowFactory')) {
        throw new Error(`Invalid destination escrowFactory address: ${config.chain.destination.escrowFactory}`);
    }
    if (!isValidAddress(makerAsset, 'makerAsset')) {
        throw new Error(`Invalid makerAsset address: ${makerAsset}`);
    }


    // Create hash lock
    const secret = getRandomBytes32()
    const hashLock = HashLock.forSingleFill(secret)
    
    // Set up time locks
    const currentTime = BigInt(Math.floor(Date.now() / 1000))
    const timeLocks = TimeLocks.new({
        srcWithdrawal: currentTime + 60n,        // 1 minute
        srcPublicWithdrawal: currentTime + 120n, // 2 minutes
        srcCancellation: currentTime + 240n,     // 4 minutes
        srcPublicCancellation: currentTime + 360n, // 6 minutes
        dstWithdrawal: currentTime + 30n,        // 30 seconds
        dstPublicWithdrawal: currentTime + 60n,  // 1 minute
        dstCancellation: currentTime + 180n      // 3 minutes
    })
    
    // Create escrow factory
    const escrowFactory = new Address(config.chain.source.escrowFactory)

    const orderInfo: CrossChainOrderInfo = {
        salt: randBigInt(1000n),
        maker: new Address(await signer.getAddress()),
        makingAmount: ethers.parseUnits(makingAmount, 6),
        takingAmount: ethers.parseUnits(parseFloat(takingAmount).toFixed(6), 6),
        makerAsset: new Address(makerAsset), 
        // For cross-ecosystem: handle Cosmos bech32 addresses properly
        takerAsset: convertCosmosAssetToAddressWithBech32(takerAsset),
    };

  
    const escrowParams: EscrowParams = {
        hashLock: hashLock,
        timeLocks: timeLocks,
        srcChainId,
        dstChainId,
        srcSafetyDeposit: ethers.parseEther('0.001'),
        dstSafetyDeposit: ethers.parseEther('0.001'),
    };

    // Ensure details matches the SDK's Details type
    const details: Details = {
        auction: new AuctionDetails({
            initialRateBump: 0,
            points: [],
            duration: 3600n,
            startTime: currentTime,
        }),
        whitelist: [{ address: new Address(config.resolverAddress), allowFrom: 0n }],
        resolvingStartTime: 0n, // Explicitly bigint
    };

    const extra: Extra = {
        nonce: randBigInt(2n ** 40n - 1n),
        allowPartialFills,
        allowMultipleFills: allowPartialFills,
    };
    
    // Build the order
    const order: CrossChainOrder = CrossChainOrder.new(escrowFactory, orderInfo, escrowParams, details, extra);

    const signature = await signOrder(signer, srcChainId, order);
    console.log(signature)
    const orderHash = order.getOrderHash(srcChainId);

    //Submit order to relayer
    const secretHash = HashLock.hashSecret(secret)

    const submitData = {
        fromChain: srcChainId,
        toChain: dstChainId, 
        fromToken: order.makerAsset.toString(),
        toToken: order.takerAsset.toString(),
        amount: order.makingAmount.toString(),
        userAddress: order.maker.toString(),
        signature: signature,
        timelock: timeLocks,
        secretHash: secretHash
    };
    
    // 5. Submit to relayer API
    const relayerUrl = 'http://localhost:3001'
    const response = await fetch(`${relayerUrl}/v1/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            //'Authorization': `Bearer ${your_auth_key}` // If required
        },
        body: JSON.stringify(submitData)
    })
    
    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to submit order: ${response.status} ${error}`)
    }
    

    return { order: { escrowFactory, orderInfo, escrowParams, details, extra }, signature, secret, orderHash };
}

async function submitOrderDirectly(
    order: CrossChainOrder, 
    secret: string,
    srcChainId: number,
    blockchainProvider: any
) {
    // 1. Build order struct for blockchain
    const orderStruct = order.build()
    
    // 2. Get typed data for signing
    const typedData = order.getTypedData(srcChainId)
    
    // 3. Sign the order
    const signature = await blockchainProvider.signTypedData(
        orderStruct.maker,
        typedData
    )
    
    // 4. Prepare submission data
    const secretHash = HashLock.hashSecret(secret)
    const extension = order.extension.encode()
    
    const submitData = {
        srcChainId: srcChainId,
        order: orderStruct,
        signature: signature,
        quoteId: `manual-${Date.now()}`, // Custom quote ID
        extension: extension,
        secretHashes: [secretHash] // For single fill, or array for multiple fills
    }
    
    // 5. Submit to relayer API
    const relayerUrl = 'https://api.1inch.dev/fusion-plus/relayer'
    const response = await fetch(`${relayerUrl}/v1.0/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            //'Authorization': `Bearer ${your_auth_key}` // If required
        },
        body: JSON.stringify(submitData)
    })
    
    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to submit order: ${response.status} ${error}`)
    }
    
    const result = await response.json()
    
    return {
        orderHash: order.getOrderHash(srcChainId),
        signature,
        extension,
        result
    }
}

