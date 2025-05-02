import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import thresholds, { PASS } from './config.js';
import { sendNotification } from './services/grams.js';
import {changeStatus, tradeEmitter, startAnalyzerLoop} from './services/analyzer.js';
import { formattedTime } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
let botActive = false;

router.get('/', (req, res) => { 
  const filePath = path.join(__dirname, 'public', 'loginForm.html');
  res.status(200).sendFile(filePath); 
});

router.get('/bot', (req, res) => {  
  res.redirect('/');
});

router.post('/bot', (req, res) => { 
  if (!req.body) res.redirect('/');
  if (req.body.user === "owner" && req.body.pass === PASS)
    res.render('dashboard', { toggleBot: botActive, thresholds }); 
  else res.redirect('/');
});

router.post('/thresholds', (req, res) => {
  if (PASS === req.body.pass) {
    Object.assign(thresholds, req.body);
    
    sendNotification(`🛠️ Settings have been changed. ${formattedTime()}`);
    
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
