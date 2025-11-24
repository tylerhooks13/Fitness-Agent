import { env } from '../config/env';
import { logger } from '../utils/logger';

// Telegram Bot API integration is intentionally minimal.
// The runtime environment (Vercel / Node 18+) provides fetch; we do not rely on extra deps.
declare const fetch: any;

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export const sendTelegramMessage = async (text: string, chatId?: string) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    logger.warn('Telegram message not sent – missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return;
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Failed to send Telegram message', { status: response.status, body });
    } else {
      logger.info('Telegram message sent', { chatId: targetChatId });
    }
  } catch (error) {
    logger.error('Error while calling Telegram sendMessage', error);
  }
};

