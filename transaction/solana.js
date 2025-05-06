import { Connection, SystemProgram, PublicKey, VersionedTransaction, Transaction, sendAndConfirmTransaction,  Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58';
import { Wallet } from '@project-serum/anchor';
import { sleep } from '../utils.js'
import thresholds, { SOL_PK } from '../config.js';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const senderPrivateKey = bs58.decode(SOL_PK);
const wallet = new Wallet(Keypair.fromSecretKey(senderPrivateKey));

// GMGN API domain
const API_HOST = 'https://gmgn.ai'
const inputMint = 'So11111111111111111111111111111111111111112';

export async function swap(outputMint) {
  // Get quote and unsigned transaction
  const quoteUrl = `${AdPI_HOST}/defi/router/v1/sol/tx/get_swap_route?token_in_address=${inputMint}&token_out_address=${outputMint}&in_amount=${thresholds.tradeAmount}&from_address=4zUDNJz9YCVWWVQnQg8kAdG6tZSrSrHWP2b1nchQqoJZ&slippage=${thresholds.slippageBps}`;
  let route = await fetch(quoteUrl)
  route = await route.json()
 
  // Sign transaction
  const swapTransactionBuf = Buffer.from(route.data.raw_tx.swapTransaction, 'base64')
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
  transaction.sign([wallet.payer])
  const signedTx = Buffer.from(transaction.serialize()).toString('base64')
  
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

  const hash =  res.data.hash
  const lastValidBlockHeight = route.data.raw_tx.lastValidBlockHeight
  const statusUrl = `${API_HOST}/defi/router/v1/sol/tx/get_transaction_status?hash=${hash}&last_valid_height=${lastValidBlockHeight}`
  let status = await fetch(statusUrl)
  
  return status.data.success === true ? "Status: success" : "Status: failed or pending \n hash: " + hash;
}

export const refreshBalance = async () => {
  try {
    const solBalance = await connection.getBalance(wallet.publicKey);
    return (solBalance / 1e9);
  } catch (error) {
    // console.log(`Error refreshing balances: ${error.message}`);
  }
};

export const withdraw = async (amt, wl) => {
  const recipientPublicKey = new PublicKey(wl);

  try {
    // Create a transaction instruction to transfer SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientPublicKey,
        lamports: amt,
      })
    );

    // Send and confirm the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.payer]
    );
  
    return 'Transaction successful with signature: ' + signature;
  } catch (error) {
    throw 'Transaction failed: ' + error;
  }
};

