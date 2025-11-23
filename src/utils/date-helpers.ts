import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay } from 'date-fns';
import { env } from '../config/env';

export const toUserZonedDate = (date: Date | number, timezone = env.userTimezone) =>
  toZonedTime(date, timezone);

export const startOfUserDay = (date: Date = new Date()) =>
  startOfDay(toUserZonedDate(date));

export const parseTimeStringToUtc = (time: string, timezone = env.userTimezone) => {
  const [hours, minutes] = time.split(':').map(Number);
  const zonedDate = new Date();
  zonedDate.setHours(hours, minutes, 0, 0);
  return fromZonedTime(zonedDate, timezone);
};
