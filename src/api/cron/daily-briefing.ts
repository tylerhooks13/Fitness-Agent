import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { generateDailyWorkoutBriefing } from '../../services/briefing-generator';

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Daily briefing timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    );
  });

export default async function handler(_req: any, res: any) {
  try {
    const workoutSection = await withTimeout(generateDailyWorkoutBriefing(), 4000);

    logger.info('Daily briefing generated from Notion', {
      timezone: env.userTimezone,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        workoutBriefing: workoutSection,
      }),
    );
  } catch (error: any) {
    logger.error('Failed to generate daily briefing', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: error?.message ?? 'Failed to generate briefing',
      }),
    );
  }
}
