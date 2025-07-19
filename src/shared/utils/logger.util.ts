import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pino from 'pino';

import { env } from '@src/core/config/env.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Create Log Directory ---
const getLogDirectory = () => {
  const projectRoot = resolve(__dirname, '../../../');
  const logDir = join(projectRoot, 'logs');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyLogDir = join(logDir, today);

  mkdirSync(dailyLogDir, { recursive: true });

  return dailyLogDir;
};

const logDirectory = getLogDirectory();

// --- Pino Logger Configuration ---
export const logger = pino({
    level: env.LOG_LEVEL as pino.Level,
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: 'trace', // Log all levels to the file
        options: {
          destination: join(logDirectory, 'app.log'),
          mkdir: true, // Create directory if it doesn't exist
          colorize: false,
        },
      },
    ],
  },
});

// Custom log levels for different types of messages
export const log = {
  info: (message: string, context?: Record<string, unknown>): void => logger.info(context, message),
  error: (message: string, error?: Error, context?: Record<string, unknown>): void =>
    logger.error({ ...context, error: error?.message, stack: error?.stack }, message),
  warn: (message: string, context?: Record<string, unknown>): void => logger.warn(context, message),
  debug: (message: string, context?: Record<string, unknown>): void =>
    logger.debug(context, message),
};
