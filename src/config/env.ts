import dotenv from 'dotenv';

dotenv.config();

export type Env = {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  userTimezone: string;
  briefingTime: string;
  hydrationReminders: string[];
  hydrationDailyGoalOz: number;
  notionApiKey: string;
  notionWorkoutDatabaseId?: string;
  notionSessionDatabaseId?: string;
  notionExerciseDatabaseId?: string;
  notionRecoveryDatabaseId?: string;
  notionHydrationDatabaseId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
  googleRefreshToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  userPhoneNumber?: string;
};

const stringOrThrow = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env: Env = {
  nodeEnv: (process.env.NODE_ENV as Env['nodeEnv']) ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  userTimezone: process.env.USER_TIMEZONE ?? 'America/Chicago',
  briefingTime: process.env.BRIEFING_TIME ?? '06:00',
  hydrationReminders: parseCsv(process.env.HYDRATION_REMINDERS ?? '12:00,16:00,20:00'),
  hydrationDailyGoalOz: Number(process.env.HYDRATION_DAILY_GOAL_OZ ?? 120),
  notionApiKey: stringOrThrow(process.env.NOTION_API_KEY, 'NOTION_API_KEY'),
  notionWorkoutDatabaseId: process.env.NOTION_WORKOUT_DATABASE_ID,
  notionSessionDatabaseId: process.env.NOTION_SESSION_DATABASE_ID,
  notionExerciseDatabaseId: process.env.NOTION_EXERCISE_DATABASE_ID,
  notionRecoveryDatabaseId: process.env.NOTION_RECOVERY_DATABASE_ID,
  notionHydrationDatabaseId: process.env.NOTION_HYDRATION_DATABASE_ID,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  userPhoneNumber: process.env.USER_PHONE_NUMBER,
};

export const isProduction = env.nodeEnv === 'production';
