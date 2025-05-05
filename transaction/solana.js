import { Wallet } from '@project-serum/anchor'
import { Connection, Keypair, VersionedTransaction,LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58';
import { sleep } from './utils'

const inputToken = 'So11111111111111111111111111111111111111112'
const outputToken = '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs'
const amount = '50000000'
const fromAddress = '2kpJ5QRh16aRQ4oLZ5LnucHFDAZtEFz6omqWWMzDSNrx'
const slippage = 0.5

// GMGN API domain
const API_HOST = 'https://gmgn.ai'
async function main() {
  
  // Wallet initialization, skip this step if using Phantom
  const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || '')))
  console.log(`wallet address: ${wallet.publicKey.toString()}`)

  // Get quote and unsigned transaction
  const quoteUrl = `${AdPI_HOST}/defi/router/v1/sol/tx/get_swap_route?token_in_address=${inputToken}&token_out_address=${outputToken}&in_amount=${amount}&from_address=${fromAddress}&slippage=${slippage}`
  let route = await fetch(quoteUrl)
  route = await route.json()
 
  // Sign transaction
  const swapTransactionBuf = Buffer.from(route.data.raw_tx.swapTransaction, 'base64')
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
  transaction.sign([wallet.payer])
  const signedTx = Buffer.from(transaction.serialize()).toString('base64')
  console.log(signedTx)
  
  // Submit transaction
  let res = await fetch(`${API_HOST}/defi/router/v1/sol/tx/submit_signed_transaction`,
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(
        {
          "signed_tx": signedTx
        }
      )
    })
  res = await res.json()
  console.log(res)
  // Check transaction status
  // If the transaction is successful, success returns true
  // If is does not go through，expired=true will be returned after 60 seconds
  while (true) {
    const hash =  res.data.hash
    const lastValidBlockHeight = route.data.raw_tx.lastValidBlockHeight
    const statusUrl = `${API_HOST}/defi/router/v1/sol/tx/get_transaction_status?hash=${hash}&last_valid_height=${lastValidBlockHeight}`
    let status = await fetch(statusUrl)
    status = await status.json()
    console.log(status)
    if (status && (status.data.success === true || status.data.expired === true))
      break
    await sleep(1000)
  }
}

const web3 = require('@solana/web3.js');
const bs58 = require('bs58');

// Initialize connection to the Solana mainnet
const connection = new web3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Decode the sender's private key from the environment variable
const senderPrivateKey = bs58.decode(process.env.PRIVATE_KEY_BASE58);
const senderKeypair = web3.Keypair.fromSecretKey(senderPrivateKey);

// Define the recipient's public key
const recipientPublicKey = new web3.PublicKey('RecipientPublicKeyHere');

// Specify the amount to send (in lamports)
const lamportsToSend = 1_000_000; // Equivalent to 0.001 SOL

(async () => {
  try {
    // Create a transaction instruction to transfer SOL
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: lamportsToSend,
      })
    );

    // Send and confirm the transaction
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    console.log('Transaction successful with signature:', signature);
  } catch (error) {
    console.error('Transaction failed:', error);
  }
});
const { Connection, Keypair, PublicKey, VersionedTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');
const axios = require('axios');

// Initialize connection to the Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Decode the sender's private key from the environment variable
const senderPrivateKey = bs58.decode(process.env.PRIVATE_KEY_BASE58);
const senderKeypair = Keypair.fromSecretKey(senderPrivateKey);

// Define the input and output token mint addresses
const inputMint = 'So11111111111111111111111111111111111111112'; // SOL
const outputMint = 'Es9vMFrzaCERo7wFZJt3YF3hS6i7xY9Z1x9e1Z1x9e1Z'; // USDC (example)

// Specify the amount to swap (in lamports)
const amount = 1_000_000; // Equivalent to 0.001 SOL

(async () => {
  try {
    // Fetch swap quote from Jupiter API
    const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: 50, // 0.5% slippage
      },
    });

    const quote = quoteResponse.data;

    // Build swap transaction
    const swapResponse = await axios.post('https://quote-api.jup.ag/v6/swap', {
      userPublicKey: senderKeypair.publicKey.toBase58(),
      route: quote.routes[0],
      wrapUnwrapSOL: true,
    });

    const swapTransaction = swapResponse.data.swapTransaction;

    // Deserialize and sign transaction
    const transactionBuffer = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);
    transaction.sign([senderKeypair]);

    // Send and confirm transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature);

    console.log('Swap transaction successful with signature:', signature);
  } catch (error) {
    console.error('Swap transaction failed:', error);
  }
})();
