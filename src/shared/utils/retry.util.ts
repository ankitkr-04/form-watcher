import { env } from '@src/core/config/env.config';
import { InternalServerError } from '@src/core/custom.errors';

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = Number(env.MAX_RETRIES),
  baseDelayMs = Number(env.RETRY_DELAY_BASE_MS)
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const jitter = 1 + Math.random() * 0.1; // 0-10% jitter
      const delay = baseDelayMs * Math.pow(2, attempt) * jitter;

      if (attempt < maxRetries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  throw new InternalServerError(
    `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
    {
      cause: lastError,
      details: {
        maxRetries,
        baseDelayMs,
        lastError: lastError?.message,
      },
    }
  );
}
