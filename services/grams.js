import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import { STRING_SESSION, API_ID, API_HASH, CHAT_ID, BOT_TOKEN } from '../config.js';

const sessionString = STRING_SESSION || '';

// Initialize the StringSession
const stringSession = new StringSession(sessionString);

// Create a new Telegram client instance
const client = new TelegramClient(stringSession, API_ID, API_HASH, {
  connectionRetries: 5, 
  appVersion:"2.7.1",
  deviceModel:"PC",
  systemVersion:"Windows 10"
});

// Async function to start the client and authenticate
const InitializeGramsjs = async () => {
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
};


export async function sendAddress(messageText, recipient) {
  try {
    await client.sendMessage(recipient, { message: messageText });
  } catch (error) {
    console.error('Telegram send error:', error);
  }
}

export async function sendNotification(message) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: message })
  });
  return await response.json();
} 

export default InitializeGramsjs;
