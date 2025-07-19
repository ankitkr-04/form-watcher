import z from 'zod/v4';

import { ConfigurationError } from '../custom.errors';

// Core
const coreSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'staging']).default('development'),
  TZ: z.string().default('UTC'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ADMIN_EMAIL: z.email('Invalid admin email'),
});

// Database
const dbSchema = z.object({
  DATABASE_URL: z.url('Invalid database URL'),
});

// SMTP
const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1, 'SMTP host is required'),
  SMTP_PORT: z
    .string()
    .regex(/^[0-9]+$/, 'SMTP port must be a number')
    .transform(Number)
    .nonoptional('SMTP port is required'),
  SMTP_USER: z.string().min(1, 'SMTP user is required'),
  SMTP_PASS: z.string().min(1, 'SMTP password is required'),
  SMTP_FROM: z.email('Invalid SMTP from email').default('noreply@example.com'),
});

// Health
const healthSchema = z.object({
  HEALTH_CHECK_PORT: z.string().regex(/^\d+$/).default('3000').transform(Number),
});

// HTTP
const httpSchema = z.object({
  HTTP_TIMEOUT_MS: z.string().regex(/^\d+$/).default('10000').transform(Number),
  HTTP_MAX_SOCKETS: z.string().regex(/^\d+$/).default('50').transform(Number),
  HTTP_MAX_FREE_SOCKETS: z.string().regex(/^\d+$/).default('10').transform(Number),
  HTTP_KEEP_ALIVE_MS: z.string().regex(/^\d+$/).default('60000').transform(Number),
});

// Circuit Breaker
const circuitBreakerSchema = z.object({
  CB_TIMEOUT_MS: z.string().regex(/^\d+$/).default('10000').transform(Number),
  CB_FAILURE_THRESHOLD: z.string().regex(/^\d+$/).default('3').transform(Number),
  CB_SUCCESS_THRESHOLD: z.string().regex(/^\d+$/).default('2').transform(Number),
});

// Cache
const cacheSchema = z.object({
  CACHE_TTL_MS: z.string().regex(/^\d+$/).default('60000').transform(Number),
  CACHE_MAX_SIZE: z.string().regex(/^\d+$/).default('1000').transform(Number),
});

// Rate Limiting
const rateLimitSchema = z.object({
  RATE_LIMIT_DELAY_MS: z.string().regex(/^\d+$/).default('1000').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('60000').transform(Number),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).default('100').transform(Number),
  RATE_LIMIT_THROW_ON_LIMIT: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NOTIFICATION_COOLDOWN_MS: z.string().regex(/^\d+$/).default('3600000').transform(Number),
  MAX_RETRIES: z.string().regex(/^\d+$/).default('3').transform(Number),
  RETRY_DELAY_BASE_MS: z.string().regex(/^\d+$/).default('1000').transform(Number),
});

// CORS
const corsSchema = z.object({
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((x) => x.trim()) : ['*'])),
  CORS_METHODS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((x) => x.trim()) : ['GET', 'POST'])),
  CORS_ALLOWED_HEADERS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((x) => x.trim()) : ['Content-Type', 'Authorization'])),
  CORS_CREDENTIALS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  CORS_MAX_AGE: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
});

// Notifications
const notificationSchema = z.object({
  DISCORD_WEBHOOK_URL: z.url('Invalid Discord webhook URL').optional(),
  SLACK_WEBHOOK_URL: z.url('Invalid Slack webhook URL').optional(),
  SLACK_CHANNEL: z.string().optional(),
  SLACK_USERNAME: z.string().default('Form Watcher'),
  SLACK_ICON_URL: z.url('Invalid Slack icon URL').optional(),
});

// Final config schema
const configSchema = coreSchema
  .and(dbSchema)
  .and(smtpSchema)
  .and(healthSchema)
  .and(httpSchema)
  .and(circuitBreakerSchema)
  .and(cacheSchema)
  .and(rateLimitSchema)
  .and(corsSchema)
  .and(notificationSchema);

export type ValidatedConfig = z.infer<typeof configSchema>;

// eslint-disable-next-line no-undef
export function getValidatedConfig(env: NodeJS.ProcessEnv): ValidatedConfig {
  const result = configSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ConfigurationError('Invalid configuration', { errors });
  }

  // Additional semantic validation
  const data = result.data;

  if (env.SLACK_WEBHOOK_BASE && !env.SLACK_CHANNEL) {
    throw new ConfigurationError('SLACK_CHANNEL is required when SLACK_WEBHOOK_BASE is provided');
  }

  if (data.SMTP_PORT < 1 || data.SMTP_PORT > 65535) {
    throw new ConfigurationError('SMTP_PORT must be between 1 and 65535');
  }

  return data;
}
