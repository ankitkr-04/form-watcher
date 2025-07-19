import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { metrics } from '@src/shared/utils/metrics.util';

export async function handleError<T>(
  operation: () => Promise<T>,
  context: { formId?: string; watcher?: string; stage?: string; [key: string]: unknown }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ErrorLogger.logError('Operation failed', err, context);
    metrics.counter('operation_errors_total', 1, {
      watcher: context.watcher ?? 'unknown',
      formId: context.formId ?? 'unknown',
      stage: context.stage ?? 'unknown',
      error: err.constructor.name,
    });
    throw err;
  }
}
