import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export default async function handler(_req: any, res: any) {
  logger.info('Hydration reminder cron triggered', { timezone: env.userTimezone });
  // TODO: send reminder SMS and include current hydration total
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}
