import { Connection, SystemProgram, PublicKey, VersionedTransaction, Transaction, sendAndConfirmTransaction,  Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58';
import { Wallet } from '@project-serum/anchor';
import { sleep } from '../utils.js'
import thresholds, { SOL_PK, RPC } from '../config.js';

const connection = new Connection(RPC, 'confirmed');
const senderPrivateKey = bs58.decode(SOL_PK);
const wallet = new Wallet(Keypair.fromSecretKey(senderPrivateKey));

// GMGN API domain
const sol = 'So11111111111111111111111111111111111111112';
let outputMint;
let inputMint;
let tradeAmount;

export async function swap(mint, sell = false, amt) {
  if (sell) {
    outputMint = sol;
    inputMint = mint;
    tradeAmount = amt || thresholds.tradeAmount;
  } else {
    inputMint = sol;
    outputMint = mint;
    tradeAmount = thresholds.tradeAmount;
  }
  // Get quote and unsigned transaction
 const quoteResponse = await (
   await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${tradeAmount}&slippageBps=${thresholds.slippageBps}`
   )
 ).json();

 const { swapTransaction } = await (
  await fetch('https://lite-api.jup.ag/swap/v1/swap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh"
        }
      }
    })
   })
  ).json();

  const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));

  transaction.sign([wallet.payer]);

  const transactionBinary = transaction.serialize();
  const signature = await connection.sendRawTransaction(transactionBinary, {
    skipPreflight: true,
    maxRetries: 2
  });

  const confirmation = await connection.confirmTransaction({signature,}, "finalized");

  if (confirmation.value.err) {
    return (`Transaction failed: https://solscan.io/tx/${signature}/`);
  } else return (`Transaction successful: https://solscan.io/tx/${signature}/`);
}

export const refreshBalance = async () => {
  try {
    const solBalance = await connection.getBalance(wallet.publicKey);
    return (solBalance / 1e9);
  } catch (error) {
    console.log(`Error refreshing balances: ${error.message}`);
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
  
    return (`Transaction sent: https://solscan.io/tx/${signature}/`);
  } catch (error) {
    throw 'Transaction failed: ' + error;
  }
};

