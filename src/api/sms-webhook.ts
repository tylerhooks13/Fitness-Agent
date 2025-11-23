import twilio from 'twilio';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { handleTextMessage } from '../services/message-router';

const isNumeric = (value: string) => /^-?\d+(\.\d+)?$/.test(value);

const parseFormBody = async (req: any): Promise<Record<string, any>> => {
  if (req.body) return req.body;

  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(buffers).toString('utf8');
  const params = new URLSearchParams(raw);
  const body: Record<string, string> = {};
  params.forEach((value, key) => {
    body[key] = value;
  });
  return body;
};

const respond = (res: any, message: string) => {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/xml');
  res.end(twiml.toString());
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  const body = await parseFormBody(req);
  const incomingBody = (body.Body || '').toString().trim();

  try {
    const reply = await handleTextMessage(incomingBody);
    respond(res, reply);
  } catch (error) {
    logger.error('Error while handling SMS message', error);
    respond(res, 'Something went wrong while processing that message. Try again in a bit.');
  }
}
