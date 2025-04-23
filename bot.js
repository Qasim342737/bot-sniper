import express from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import pRetry from 'p-retry';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js'; 
import input from 'input'; 
import formattedTime from './formatTime.js'; 
import fs from 'fs';
import dotenv from 'dotenv'; 
import basicAuth from 'express-basic-auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fetchedTokens = new Set();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const botToken = process.env.BOT_TOKEN;
const apiId = parseInt(process.env.API_ID); 
const apiHash = process.env.API_HASH; 
let sessionString = process.env.STRING_SESSION || '';

let botActive = false;
let sendTokens = 0;
let thresholds = {
  liquidity: 8000,
  fdv: 30000,
  mc: 2000,
  age: 2,
  recipientBot: "@bonkbot_bot",
  maxTrade: 10,
  slippageBps: 200,
  pollInterval: (1000 * 30),
};

const httpAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  timeout: 30000
});

function sleep(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Initialize the StringSession
const stringSession = new StringSession(sessionString);

// Create a new Telegram client instance
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5, 
  appVersion:"2.7.1",
  deviceModel:"PC",
  systemVersion:"Windows 10"
});

// Async function to start the client and authenticate
(async () => {

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
  // await sendMessage('me', 'Hello from O_C Mining!');
})();

// Function to send a message to a specified recipient
async function sendMessage(messageText) {
  try {
    await client.sendMessage(thresholds.recipientBot, { message: messageText });
  } catch (error) {
    // console.error('Error sending message:', error);
    io.emit('notification', {message: "err gramsjs"})
  }
}

const sendNotification = (message) => {
  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: process.env.CHAT_ID,
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
    io.emit('notification', {message: `tel api: ${error.message}`})
  });
};

const authMiddleware = basicAuth({
  users: {
    'user0': process.env.USER0,
    'user1': process.env.USER1,
  },
  challenge: true,
  unauthorizedResponse: 'Unauthorized access'
});

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
  const pass = req.body.pass;
  if (pass == process.env.USER0 || pass == process.env.USER1) {
    const newThresholds = req.body;
    thresholds = { ...thresholds, ...newThresholds };
   
    sendNotification(`Settings have been changed. ${formattedTime()}`);
   
    io.emit('thresholdsUpdate', thresholds);
    res.json(thresholds);
  } else { 
    return res.status(401).send(req.body.pass);
  }
});

app.get('/logout', (req, res) => {
  res.status(401).send('You have been logged out.'); // Or redirect to login
});

app.get('/bot', authMiddleware, (req, res) => {
  res.render('dashboard', { toggleBot: botActive, thresholds });
});

app.get('/trades-history', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'history.txt');
  res.sendFile(filePath);
});

const keepAliveAgent = new https.Agent({ keepAlive: true });

async function robustFetch(url, options = {}) {
  return pRetry(
    async () => {
      try {
        const res = await fetch(url, {
          ...options,
          agent: keepAliveAgent
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        throw new Error(`Network error: ${err.message}`);
      }
    },
    { retries: 3, minTimeout: 1000, factor: 2 },
  );
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
    io.emit('notification', { message: `⚠️ Error verifying token ${tokenAddress}: ${err.message}` });
    // console.error('Error verifying rug:', err);
    return false;
  }
}

function potentialAddresses(tokens) {
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
        fdv >= thresholds.fdv &&
        mc >= thresholds.mc &&
        liquidity >= thresholds.liquidity
      );
    }

    return false;
  })
  .map((token) => ({ name: token?.baseToken?.name, address: token?.baseToken?.address }));
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
    const newTokens = solanaData.filter(t => !fetchedTokens.has(t.baseToken?.address));;
    return potentialAddresses(newTokens);
  } catch (err) {
    io.emit('notification', { message: `🚨 Error fetching token data: ${err.message}` });
    console.error('Error fetching token data:', err);
    return [];
  }
}

async function verifyTokens(tokens) {
  for (const token of tokens) {
    if (!token.address) continue;
    const result = await verifyWithRugcheck(token.address);

    if (!result) {
      io.emit('notification', { message: `❌ Token verification failed or flagged as rugged.` });
      continue;
    }

    if (sendTokens >= thresholds.maxTrade) {
      io.emit('notification', {message: "you have reached the max Trade threshold of " + thresholds.maxTrade})
      sendNotification("Reached the max Trade thresholds of " + thresholds.maxTrade + " bot deactivated" + formattedTime())
      botActive = false;
      break;
    };

    try {
      await sendMessage(result) 
      const historyPath = path.join(__dirname, 'public', 'history.txt');
      fs.appendFileSync(historyPath,
       `Token Name: ${token.name}\nToken Address: ${token.address}\nTimestamp: ${formattedTime()}\n\n\n`,
       'utf8'
      );

      sendTokens++;
      await sleep(4000, 8000);
      io.emit('notification', { message: `🚀 ${token.name} with address of '${token.address}' send to telegram bot successfully!` });
      const msg = `🚀 ${token.name} (${formattedTime()})\nAddress: ${token.address}`;
      await sendNotification(msg);
    } catch (err) {
      io.emit('notification', { message: `❌ failed to send ${token.name}: ${err.message}` });
    }
  }
}


async function runAnalyzer() {
  if (!botActive) return;
  io.emit('notification', { message: '📊 Analyzing market data...' });
  const tokens = await fetchTokenData(); 
  await verifyTokens(tokens); 
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

app.get('/toggle-bot', (req, res) => {
  if (!botActive) {
     botActive = true;
     startAnalyzerLoop();
     io.emit('notification', { message: `✔️ Bot activated`});
  } else {
     botActive = false;
     io.emit('notification', { message: `❌ Bot terminated`});
  }
  res.json({status: botActive});
});


server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
