import dotenv from 'dotenv';
dotenv.config();

export const {
  BOT_TOKEN,
  API_ID,
  API_HASH,
  STRING_SESSION,
  CHAT_ID,
  PASS
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
  slippageBps: 200,
  pollInterval: (1000 * 30),
};

export default thresholds;
