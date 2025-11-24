import { logger } from '../utils/logger';
import { handleTextMessage } from '../services/message-router';
import { sendTelegramMessage } from '../integrations/telegram';

const parseJsonBody = async (req: any): Promise<any> => {
  if (req.body) return req.body;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  const update = await parseJsonBody(req);

  const message = update.message || update.edited_message;
  const text: string | undefined = message?.text;
  const chatId: string | number | undefined = message?.chat?.id;

  if (!text || !chatId) {
    logger.warn('Telegram webhook received update without text or chat id');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, ignored: true }));
    return;
  }

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  if (allowedChatId && String(chatId) !== allowedChatId) {
    logger.warn('Telegram message from unauthorized chat id, ignoring', {
      chatId,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, unauthorized: true }));
    return;
  }

  try {
    const reply = await handleTextMessage(text);
    await sendTelegramMessage(reply, String(chatId));
  } catch (error) {
    logger.error('Failed to handle Telegram message', error);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}
