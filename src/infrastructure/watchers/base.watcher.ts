import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { Form, Watcher, WatcherResult } from '@src/shared/types/types';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';
import { metrics } from '@src/shared/utils/metrics.util';

import { Cache } from '../cache';

export abstract class BaseWatcher implements Watcher {
  protected readonly cache: Cache;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly fetcher: ContentFetcher;
  protected readonly hasher: HashGenerator;
  protected readonly logger: ErrorLogger;

  constructor(
    protected readonly name: string,
    circuitBreaker: CircuitBreaker,
    cache: Cache,
    fetcher: ContentFetcher,
    hasher: HashGenerator,
    logger: ErrorLogger
  ) {
    this.cache = cache;
    this.circuitBreaker = circuitBreaker;
    this.fetcher = fetcher;
    this.hasher = hasher;
    this.logger = logger;
  }

  public async check(form: Form): Promise<WatcherResult> {
    const start = Date.now();

    try {
      const result = await this.circuitBreaker.execute(form.id, () => this.executeCheck(form));

      metrics.histogram('watcher_check_duration_seconds', (Date.now() - start) / 1000, {
        watcher: this.name,
        formId: form.id,
        status: 'success',
      });

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errorName = err.constructor.name;

      metrics.counter('watcher_check_errors_total', 1, {
        watcher: this.name,
        formId: form.id,
        error: errorName,
      });

      this.logger.logWatcherError(form.id, err, {
        form,
        circuitState: this.circuitBreaker.getState(form.id),
        error: errorName,
      });

      throw err;
    }
  }

  protected abstract executeCheck(form: Form): Promise<WatcherResult>;
}
