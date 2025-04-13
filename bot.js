import express from 'express';
import http from 'http';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import pRetry from 'p-retry';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js'; 
import input from 'input'; 
import formattedTime from './formatTime.js'; 
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fetchedTokens = new Set();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const chatId = 'CHAT_ID';
const botToken = process.env.BOT_TOKEN // Telegram bot Token
const apiId = parseInt(process.env.API_ID); // Telegram API ID
const apiHash = process.env.API_HASH; // Telegram API Hash
let sessionString = process.env.STRING_SESSION || ''; // Your saved session string

let botActive = false;
let sendTokens = 0;
let thresholds = {
  liquidity: 8000,
  fdv: 30000,
  mc: 2000,
  age: 2,
  recipientBot: "",
  maxTrade: 10,
  slippageBps: 200,
  tradeAmount: 1000000,
  pollInterval: (1000 * 30),
};

// Initialize the StringSession
const stringSession = new StringSession(sessionString);

// Create a new Telegram client instance
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// Async function to start the client and authenticate
(async () => {
  console.log('Starting Telegram client...');

  // Connect the client
  await client.connect();

  // Check if the client is already authorized
  const isAuthorized = await client.checkAuthorization();

  if (!isAuthorized) {
    // If not authorized, start the login process
    await client.start({
      phoneNumber: async () => await input.text('Please enter your phone number: '),
      password: async () => await input.text('Please enter your password (if any): '),
      phoneCode: async () => await input.text('Please enter the code you received: '),
      onError: (err) => console.log(err),
    });

    // Save the session string to the .env file or secure storage
    const newSession = client.session.save();
    console.log('New session string:', newSession);
    // You can implement a function to update your .env file or secure storage with the new session string
  } else {
    console.log('Client is already authorized.');
  }

  // Example: Send a message
  await sendMessage('me', 'Hello from O_C Mining!');
})();

// Function to send a message to a specified recipient
async function sendMessage(messageText) {
  try {
    await client.sendMessage(thresholds.recipientBot, { message: messageText });
    console.log(`Message sent to ${recipientBot}: "${messageText}"`);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

const sendNotification = (message) => {
  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) {
      io.emit('notification', {message: 'Notification Message sent successfully'});
    } else {
      console.error('Error sending message:', data);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    io.emit('notification', {message: error.message})
  });
};

app.use(corse());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/thresholds', (req, res) => {
  const newThresholds = req.body;
  if (typeof newThresholds.tradeAmount !== 'number' || newThresholds.tradeAmount <= 0) {
    return res.status(400).json({ error: 'Invalid tradeAmount value' });
  }
  thresholds = { ...thresholds, ...newThresholds };
  sendNotification("settings changed");
  io.emit('thresholdsUpdate', thresholds);
  res.json(thresholds);
});

app.get('/', (req, res) => {
  res.render('dashboard', { toggleBot: botActive, thresholds });
});

app.get('/toggle-bot', (req, res) => {
  if (!botActive) {
     botActive = true;
     startAnalyzerLoop();
     io.emit('notification', { message: `✔️ Bot activated`});
     sendNotification('Bot activated')
  } else {
     botActive = false;
     io.emit('notification', { message: `✔️ Bot terminated`});
     sendNotification('Bot terminated')
  }
  res.json({status: botActive});
});

app.get('/trades-history', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'history.txt');
  res.sendFile(filePath);
});

async function verifyWithRugcheck(token) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${token.address}/report`;
  try {
    const response = await robustFetch(url);
    if (!response.ok) throw new Error(`RugCheck API error: ${response.status}`);
    const report = await response.json();
    if (report?.rugged) return false;
    return token;
  } catch (err) {
    io.emit('notification', { message: `⚠️ Error verifying token ${tokenAddress}: ${err.message}` });
    sendNotification(`RugCheck: ${err.message}`)
    // console.error('Error verifying rug:', err);
    return false;
  }
}

async function robustFetch(url, options = {}) {
  return pRetry(
    async () => {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        throw new Error(`Network error: ${err.message}`);
      }
    },
    { retries: 3, minTimeout: 1000, factor: 2 },
  );
}

function potentialAddresses(tokens) {
  tokens.forEach(t => fetchedTokens.add(t.baseToken.address));
  return tokens.filter((token) => {
    const now = Math.floor(Date.now() / 1000); // In seconds
    const fdv = token.fdv || 0;
    const mc = token.marketCap || 0;
    const liquidity = token.liquidity?.usd || 0;

    // Convert pairCreatedAt to seconds
    const createdAt = Math.floor((token.pairCreatedAt || 0) / 1000);

    const differenceInSeconds = now - createdAt;

    if (differenceInSeconds < 0) {
      sendNotification(`Future timestamp for token: ${token.name || "unknown"} | Raw: ${token.pairCreatedAt}`);
      return false;
    }

    const age = Math.floor(differenceInSeconds / 60); // Age in minutes

    if (age <= thresholds.age) {
      return (
        fdv >= thresholds.fdv &&
        mc >= thresholds.mc &&
        liquidity >= thresholds.liquidity
      );
    }

    return false;
  })
  .map((token) => { name: token.baseToken.name, address: token.baseToken?.address } || { address: false });
}

async function fetchTokenData() {
  try {
    const response = await robustFetch("https://api.dexscreener.com/token-profiles/latest/v1");
    if (!response.ok) throw new Error(`DEXSCREENER_API error: ${response.status}`);
    const data = await response.json();
    const solanaTokens = data
      .filter((token) => token.chainId.toLowerCase() === 'solana')
      .map((token) => token.tokenAddress)
      .join(',');
    if (!solanaTokens.length) return [];
    const tokenResponse = await robustFetch(`https://api.dexscreener.com/tokens/v1/solana/${solanaTokens}`);
    if (!tokenResponse.ok) throw new Error(`DEXSCREENER_API_SOL error: ${tokenResponse.status}`);
    const solanaData = await tokenResponse.json();
    const newTokens = solanaData.filter(t => !fetchedTokens.has(t.baseToken.address));;
    return potentialAddresses(newTokens);
  } catch (err) {
    io.emit('notification', { message: `🚨 Error fetching token data: ${err.message}` });
    sendNotification("Error fetching token on Dexscreener "+ err.message)
    // console.error('Error fetching token data:', err);
    return [];
  }
}

async function verifyTokens(tokens) {
  for (const token of tokens) {
    if (!token.address) continue;
    const result = await verifyWithRugcheck(token);

    sendNotification(`Token with the name of ${token.name} mint address of ${token.address} is verified`);
    io.emit('notification', { message: `Token with mint address of ${result} is verified`});

    if (sendTokens >= thresholds.maxTrade) {
      io.emit('notification', {message: "you have reached the max Trade threshold of " + thresholds.maxTrade})
      sendNotification("you have reached the max Trade thresholds of " + thresholds.maxTrade + " autoTrade disabled")
      autoTradeEnabled = false;
      break;
    };

    try {
      await client.sendMessage(result) 

      fs.appendFileSync('history.txt', `
          Token name: ${token.name}\n
          Token address: ${token.address}\n
          Timestamp: ${formattedTime()}\n\n\n
      `, 'utf8');
    
      sendTokens++;
      sendNotification(`🚀 ${token.name} with the address of '${token.address}' send to telegram bot successfully!`);
      io.emit('notification', { message: `🚀 ${token.name} with address of '${token.address}' send to telegram bot successfully!` });
    } catch (err) {
      sendNotification(`❌ failed to send ${token.name}: ${err.message}`);
      io.emit('notification', { message: `❌ failed to send ${token.name}: ${err.message}` });
    }
  }
}

io.on('connection', (socket) => {
  sendNotification('bot has visitor')
  socket.on('disconnect', () => sendNotification('visitor just left'));
});

async function runAnalyzer() {
  io.emit('notification', { message: '📊 Analyzing market data...' });
  const tokens = await fetchTokenData();
  const verifiedTokens = await verifyTokens(tokens);
}

async function startAnalyzerLoop() {
  while (botActive) {
    const startTime = Date.now();
    await runAnalyzer();
    const elapsedTime = Date.now() - startTime;
    const delay = Math.max(0, thresholds.pollInterval - elapsedTime);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
