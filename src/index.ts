import express from 'express';
import { env } from './config/env';
import { logger } from './utils/logger';
import dailyBriefingHandler from './api/cron/daily-briefing';
import smsWebhookHandler from './api/sms-webhook';
import imessageInboundHandler from './api/imessage/inbound';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  console.log('[REQ]', req.method, req.url);
  next();
});

app.get('/', (_req, res) => {
  res.send('Fitness Agent server is running. Try GET /health or /api/cron/daily-briefing');
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timezone: env.userTimezone });
});

// Mount serverless-style handlers for local development
app.get('/api/cron/daily-briefing', (req, res) => {
  // handler expects (req, res) compatible with Node/Vercel
  void dailyBriefingHandler(req, res);
});

app.post('/api/sms/webhook', (req, res) => {
  void smsWebhookHandler(req, res);
});

app.post('/api/imessage/inbound', (req, res) => {
  void imessageInboundHandler(req, res);
});

const port = env.port || 3000;
app.listen(port, () => {
  logger.info(`Local dev server running on http://localhost:${port}`);
});
