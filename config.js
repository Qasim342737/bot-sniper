import dotenv from 'dotenv';
dotenv.config();

export const {
  BOT_TOKEN,
  API_ID,
  API_HASH,
  STRING_SESSION,
  CHAT_ID,
  PASS,
  SOL_PK
} = process.env;

const thresholds = {
  minLiquidity: 7550,
  maxLiquidity: 50000,
  minFdv: 10000,
  maxFdv: 3000000,
  minMc: 2000,
  maxMc: 300000,
  age: 2,
  chain: "solana",
  recipientBot: "@maestro",
  maxTrade: 10,
  tradeAmount: 0.006e9,
  slippageBps: 0.5,
  pollInterval: (1000 * 30),
};

export default thresholds;
