type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const shouldLog = (level: LogLevel) => levelPriority[level] >= levelPriority[envLogLevel];

const formatMessage = (level: LogLevel, message: string) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message), meta ?? '');
  },
  info: (message: string, meta?: unknown) => {
    if (shouldLog('info')) console.info(formatMessage('info', message), meta ?? '');
  },
  warn: (message: string, meta?: unknown) => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message), meta ?? '');
  },
  error: (message: string, meta?: unknown) => {
    if (shouldLog('error')) console.error(formatMessage('error', message), meta ?? '');
  },
};
