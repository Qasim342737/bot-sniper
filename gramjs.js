import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

const apiId = 123456;
const apiHash = "123456abcdfg";
const stringSession = new StringSession(""); // fill this later with the value from session.save()

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in again
  await client.sendMessage("me", { message: "Hello!" });
}) ();


// // Initialize the StringSession
// const stringSession = new StringSession(sessionString);
//
// // Create a new Telegram client instance
// const client = new TelegramClient(stringSession, apiId, apiHash, {
//   connectionRetries: 5,
// });
//
// // Async function to start the client and authenticate
// (async () => {
//   console.log('Starting Telegram client...');
//
//   // Connect the client
//   await client.connect();
//
//   // Check if the client is already authorized
//   const isAuthorized = await client.checkAuthorization();
//   console.log(isAuthorized)
//   if (!isAuthorized) {
//     // If not authorized, start the login process
//     await client.start({
//       phoneNumber: async () => await input.text('Please enter your phone number: '),
//       password: async () => await input.text('Please enter your password (if any): '),
//       phoneCode: async () => await input.text('Please enter the code you received: '),
//       onError: (err) => console.log(err),
//     });
//
//     // Save the session string to the .env file or secure storage
//     const newSession = client.session.save();
//     console.log('New session string:', newSession);
//     // You can implement a function to update your .env file or secure storage with the new session string
//   } else {
//     console.log('Client is already authorized.');
//   }
//
//   // Example: Send a message
//   await sendMessage('me', 'Hello from GramJS!');
// })();

