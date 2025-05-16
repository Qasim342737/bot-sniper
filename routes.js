import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import thresholds, { PASS } from './config.js';
import { sendNotification } from './services/grams.js';
import { changeAlternate, changeStatus, tradeEmitter, startAnalyzerLoop } from './services/analyzer.js';
import { formattedTime } from './utils.js';
import { refreshBalance, withdraw, swap} from './transaction/solana.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
let botActive = false;
let alternate = false;

router.get('/', (req, res) => { 
  const filePath = path.join(__dirname, 'public', 'loginForm.html');
  res.status(200).sendFile(filePath); 
});

router.get('/bot', (req, res) => {  
  res.redirect('/');
});

router.post('/bot', async (req, res) => { 
  if (!req.body) res.redirect('/');
  if (req.body.user === "owner" && req.body.pass === PASS) {
    res.render('dashboard', { toggleBot: botActive, alternate, thresholds }); 
  }
  else res.redirect('/');
});

router.post('/thresholds', (req, res) => {
  if (PASS === req.body.pass) {
    Object.assign(thresholds, req.body);
    
    sendNotification(`🛠️ Settings have been changed. ${formattedTime()}`); 
    rest.status(200).send('success');
  } else {
    res.status(401).send('Unauthorized');
  }
});

router.get('/trades-history', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'history.txt');
  res.sendFile(filePath);
});

router.get('/toggle-bot', (req, res) => {
  if (!botActive) {
    botActive = true;
    changeStatus(botActive);
    startAnalyzerLoop();
    tradeEmitter.emit('tradeUpdate', "Analyzing 📊");
  } else {
    botActive = false;
    changeStatus(botActive);
  }
  tradeEmitter.emit('tradeUpdate', botActive ? "✔️ Bot activated" : "❌ Bot terminated");
  res.json({status: botActive});
});

router.get('/toggle-alternate', (req, res) => {
  if (!alternate) {
    alternate = true;
    changeAlternate(alternate);
    tradeEmitter.emit('tradeUpdate', "No more auto sale");
  } else {
    alternate = false;
    changeAlternate(alternate);
  }
  res.json({status: alternate});
});

router.post('/withdraw', async (req, res) => {
  if (PASS === req.body.pass) {
    try {
      const success = await withdraw(Number(req.body.amt ) * 1e9, req.body.walletAddress);
      sendNotification(success);  
      rest.status(200).send(success);
    } catch(err) {
      res.status(400).send("unsuccessfully") 
      console.log(err)
    }
  } else res.status(401).send('Unauthorized');
 
});

router.post('/sell', async (req, res) => {
  if (PASS === req.body.pass) {
    try {
      const success = await swap(req.body.address, true, req.body.amt);
      sendNotification(success);  
      rest.status(200).send(success); 
    } catch(err) {
      res.status(400).send("unsuccessfull") 
      console.log(err)
    }
  } else res.status(401).send('Unauthorized');
 
});

router.get("/bal", async (req, res) => {
  const bal = await refreshBalance();
  res.send(bal);
})

export default router;
