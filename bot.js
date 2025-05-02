import express from 'express';
import helmet from 'helmet';
import http from 'http';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io'; 
import InitializeGramsjs from './services/grams.js';

import router from './routes.js';
import { tradeEmitter, startAnalyzerLoop } from './services/analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(router);

InitializeGramsjs();
tradeEmitter.on('tradeUpdate', (message) => io.emit('notification', message));

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
