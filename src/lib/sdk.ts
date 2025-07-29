import {
    HashLock,
    NetworkEnum,
    OrderStatus,
    PresetEnum,
    PrivateKeyProviderConnector,
    SDK
} from '@1inch/cross-chain-sdk'
import Web3 from 'web3'
// import {randomBytes} from 'node:crypto'  
import dotenv from 'dotenv'
// import AxiosProviderConnector from "@1inch/limit-order-sdk";

// dotenv.config()

const privateKey = process.env.NEXT_PUBLIC_WALELT_PRIVATE_KEY as string;
const rpc = 'https://eth-sepolia.public.blastapi.io'
const authKey = process.env.NEXT_PUBLIC_1INCH_API_KEY as string;
const source = 'sdk-tutorial'

const web3 = new Web3(rpc)
const walletAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address

const sdk = new SDK({
    url: 'https://api.1inch.dev/fusion-plus',
    authKey,
    blockchainProvider: new PrivateKeyProviderConnector(privateKey, web3), // only required for order creation 
    // httpProvider: new AxiosProviderConnector(),
})

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomBytes(length: number): string {
    const array = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        // Browser environment
        window.crypto.getRandomValues(array);
    } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
        // Web Workers or other environments with crypto
        globalThis.crypto.getRandomValues(array);
    } else {
        // Fallback for older browsers (not cryptographically secure)
        console.warn('Using fallback random generation - not cryptographically secure');
        for (let i = 0; i < length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }

    return '0x' + Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function main(): Promise<void> {
    try {
        // 10 USDT (Polygon) -> BNB (BSC)  
        console.log('Getting quote...')


        const quote = await sdk.getQuote({
            amount: '10000000',
            srcChainId: NetworkEnum.POLYGON,
            dstChainId: NetworkEnum.BINANCE,
            enableEstimate: true,
            srcTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT  
            dstTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // BNB  
            walletAddress
        })

        // console.log('Quote received:', quote)

        const preset = PresetEnum.fast

        // generate secrets  
        // const secrets = Array.from({  
        //     length: quote.presets[preset].secretsCount  
        // }).map(() => '0x' + randomBytes(32).toString('hex'))  
        const secrets = Array.from({
            length: quote.presets[preset].secretsCount
        }).map(() => randomBytes(32))

        const hashLock =
            secrets.length === 1
                ? HashLock.forSingleFill(secrets[0])
                : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets))

        const secretHashes = secrets.map((s) => HashLock.hashSecret(s))

        console.log('Creating order...')

        // create order  
        const orderResult = await sdk.createOrder(quote, {
            walletAddress,
            hashLock,
            preset,
            source,
            secretHashes
        })

        const { hash, quoteId, order } = orderResult
        console.log({ hash }, 'order created')

        // Type guard to ensure we have an EVM order
        if (!('inner' in order)) {
            throw new Error('Expected EVM cross-chain order but received SVM order')
        }

        console.log('Submitting order...')

        // submit order with proper typing
        const _orderInfo = await sdk.submitOrder(
            quote.srcChainId,
            order, // Now TypeScript knows this is EvmCrossChainOrder
            quoteId,
            secretHashes
        )
        console.log({ hash }, 'order submitted')

        console.log(_orderInfo);

        console.log('Monitoring order and sharing secrets...')

        // This is where we send to relayer.

        // submit secrets for deployed escrows  
        while (true) {
            const secretsToShare = await sdk.getReadyToAcceptSecretFills(hash)

            if (secretsToShare.fills.length) {
                for (const { idx } of secretsToShare.fills) {
                    await sdk.submitSecret(hash, secrets[idx])

                    console.log({ idx }, 'shared secret')
                }
            }

            // check if order finished  
            const { status } = await sdk.getOrderStatus(hash)
            console.log('Current status:', status)

            if (
                status === OrderStatus.Executed ||
                status === OrderStatus.Expired ||
                status === OrderStatus.Refunded
            ) {
                break
            }

            await sleep(1000)
        }

        const statusResponse = await sdk.getOrderStatus(hash)
        console.log('Final status:', statusResponse)

    } catch (error) {
        console.error('Error in cross-chain swap:', error)

        // Enhanced error handling
        if (error instanceof Error) {
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
        }

        // Check for specific API errors
        if (error && typeof error === 'object' && 'response' in error) {
            console.error('API Response Error:', error.response)
        }
    }
}

main().catch(console.error)