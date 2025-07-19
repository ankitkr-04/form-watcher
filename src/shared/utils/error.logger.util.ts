import { ConfigurationError, NetworkError, ValidationError } from '@src/core/custom.errors';

import { log } from './logger.util';
import { metrics } from './metrics.util';

export class ErrorLogger {
  constructor(private readonly watcherName: string) {}

  public static logError(
    message: string,
    error: unknown,
    context: Record<string, unknown> = {}
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const name = err.constructor.name;

    log.error(message, {
      ...context,
      message: err.message,
      stack: err.stack,
      name,
      cause: err.cause,
    });

    metrics.counter('errors_total', 1, { error: name });
  }

  public logWatcherError(
    formId: string,
    error: unknown,
    context: Record<string, unknown> = {}
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const name = err.constructor.name;

    if (err instanceof NetworkError) {
      log.warn(`Network error in ${this.watcherName} for form ${formId}: ${err.message}`);
    } else if (err instanceof ConfigurationError) {
      log.error(`Config error in ${this.watcherName} for form ${formId}: ${err.message}`);
    } else if (err instanceof ValidationError) {
      log.warn(`Validation error in ${this.watcherName} for form ${formId}: ${err.message}`);
    } else {
      log.error(`Unexpected error in ${this.watcherName} for form ${formId}: ${err.message}`, {
        stack: err.stack,
        ...context,
        message: err.message,
        name,
        cause: err.cause,
      });
    }

    metrics.counter('watcher_errors_total', 1, {
      watcher: this.watcherName,
      formId,
      error: name,
    });
  }

  public logWatcherInfo(formId: string, info: Record<string, unknown> = {}): void {
    log.info(`Watcher ${this.watcherName} info for form ${formId}`, {
      ...info,
      watcher: this.watcherName,
      formId,
    });

    metrics.counter('watcher_info_total', 1, {
      watcher: this.watcherName,
      formId,
    });
  }
}
