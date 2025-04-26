import thresholds from '../config.js';
import { sendNotification, sendAddress } from './grams.js';
import { formattedTime, robustFetch, sleep  } from '../utils.js';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';

let botActive = false;
let sentTokens = 0;

const fetchedTokens = new Set();
const __dirname = path.dirname(fileURLToPath(import.meta.url)); 

export const tradeEmitter = new EventEmitter();
export const changeStatus = (status) => { 
  botActive = status; 
};

function potentialAddresses(tokens) {
  if (fetchedTokens.size >= 100) fetchedTokens.clear();
  tokens.forEach(t => fetchedTokens.add(t.baseToken?.address));
  return tokens.filter((token) => {
    const now = Math.floor(Date.now() / 1000); // In seconds
    const fdv = token.fdv || 0;
    const mc = token.marketCap || 0;
    const liquidity = token.liquidity?.usd || 0;

    // Convert pairCreatedAt to seconds
    const createdAt = Math.floor((token.pairCreatedAt || 0) / 1000);

    const differenceInSeconds = now - createdAt;

    if (differenceInSeconds < 0) {
      return false;
    }

    const age = Math.floor(differenceInSeconds / 60); // Age in minutes

    if (age <= thresholds.age) {
      return (
        fdv >= thresholds.minFdv && fdv <= thresholds.maxFdv &&
        mc >= thresholds.minMc && mc <= thresholds.maxMc &&
        liquidity >= thresholds.minLiquidity && liquidity <= thresholds.maxLiquidity
      );
    }

    return false;
  })
  .map((token) => ({ chain: token?.chainId, name: token?.baseToken?.name, address: token?.baseToken?.address }));
}

async function fetchTokenData() {
  try {
    const response = await robustFetch("https://api.dexscreener.com/token-profiles/latest/v1");
    if (!response.ok) throw new Error(`DEXSCREENER_API error: ${response.status}`);
    const data = await response.json();
    const chainTokens = data
      .filter((token) => token.chainId.toLowerCase() == thresholds.chain)
      .map((token) => token.tokenAddress)
      .join(','); 
    if (!chainTokens.length) return [];
    const tokenResponse = await robustFetch(`https://api.dexscreener.com/tokens/v1/solana/${chainTokens}`);
    if (!tokenResponse.ok) throw new Error(`DEXSCREENER_API_SOL error: ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json();
    const newTokens = tokenData.filter(t => !fetchedTokens.has(t.baseToken?.address));;
    return potentialAddresses(newTokens);
  } catch (err) {
    tradeEmitter.emit('tradeUpdate', `🚨 Error fetching token data: ${err.message}`);
    // console.error('Error fetching token data:', err);
    return [];
  }
} 

async function verifyWithRugcheck(token) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${token}/report`;
  try {
    const response = await robustFetch(url);
    if (!response.ok) throw new Error(`RugCheck API error: ${response.status}`);
    const report = await response.json();
    if (report?.rugged) return false;
    return token;
  } catch (err) {
    tradeEmitter.emit('tradeUpdate', `⚠️ Error verifying token ${tokenAddress}: ${err.message}`);
    // console.error('Error verifying rug:', err);
    return false;
  }
}

async function verifyTokens(tokens) {
  for (const token of tokens) {
    if (!token.address) continue;
    const result = await verifyWithRugcheck(token.address);

    if (!result) {
      tradeEmitter.emit('tradeUpdate', `❌ Token verification failed or flagged as rugged.`);
      continue;
    }

    if (sentTokens >= thresholds.maxTrade) {
      tradeEmitter.emit('tradeUpdate', "you have reached the max Trade threshold of " + thresholds.maxTrade);
      sendNotification("Reached the max Trade thresholds of " + thresholds.maxTrade + " bot deactivated" + formattedTime());
      botActive = false;
      break;
    };

    try {
      await sendMessage(result);
      const historyPath = path.join(__dirname, 'public', 'history.txt');
      fs.appendFileSync(historyPath,
       `Token Name: ${token.name}\nToken Address: ${token.address}\nTimestamp: ${formattedTime()}\n\n\n`,
       'utf8'
      );

      sentTokens++;
      await sleep(4000, 8000);
      tradeEmitter.emit('tradeUpdate', `🚀 ${token.name} with address of '${token.address}' send to telegram bot successfully!`);
      tradeEmitter.emit('tradeUpdate', token);
      const msg = `🚀 ${token.name} (${formattedTime()})\nAddress: ${token.address}`;
      await sendNotification(msg);
    } catch (err) {
      tradeEmitter.emit('tradeUpdate', `❌ failed to send ${token.name}: ${err.message}`);
    }
  }
  tradeEmitter.emit('tradeUpdate', "Analyzing 📊");
}

export async function startAnalyzerLoop() {
  while (botActive) {
    const startTime = Date.now();
    if (!botActive) return;
    const tokens = await fetchTokenData(); 
    await verifyTokens(tokens); 
    const elapsedTime = Date.now() - startTime;
    const delay = Math.max(0, thresholds.pollInterval - elapsedTime);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
