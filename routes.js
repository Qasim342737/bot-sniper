import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import thresholds, { USER0, USER1 } from './config.js';
import basicAuth from 'express-basic-auth';
import { sendNotification } from './services/grams.js';
import {changeStatus, tradeEmitter, startAnalyzerLoop} from './services/analyzer.js';
import { formattedTime } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
let botActive = false;

const authMiddleware = basicAuth({
  users: { 'user0': USER0, 'user1': USER1 },
  challenge: true,
  unauthorizedResponse: 'Unauthorized'
});

router.get('/bot', authMiddleware, (req, res) => {
  res.render('dashboard', { toggleBot: botActive, thresholds });
});

router.post('/thresholds', (req, res) => {
  if ([USER0, USER1].includes(req.body.pass)) {
    Object.assign(thresholds, req.body);
    
    sendNotification(`Settings have been changed. ${formattedTime()}`);
    
    res.json(thresholds);
    console.log(thresholds)
  } else {
    res.status(401).send('Unauthorized');
  }
});

router.get('/trades-history', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'history.txt');
  res.sendFile(filePath);
});

router.get('/logout', (req, res) => {
  res.status(401).send('You have been logged out.');
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

export default router;
