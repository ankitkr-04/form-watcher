import { metrics } from '@src/shared/utils/metrics.util';

import { Initializer } from './base-initializer';

export class MetricsInitializer implements Initializer {
  initialize(): void {
    metrics.register({
      type: 'counter',
      name: 'watcher_checks_total',
      help: 'Total number of watcher checks',
      labelNames: ['watcher', 'formId'],
    });

    metrics.register({
      type: 'counter',
      name: 'watcher_checks_success_total',
      help: 'Total number of successful watcher checks',
      labelNames: ['watcher', 'formId'],
    });

    metrics.register({
      type: 'counter',
      name: 'watcher_checks_error_total',
      help: 'Total number of failed watcher checks',
      labelNames: ['watcher', 'formId', 'error'],
    });

    metrics.register({
      type: 'histogram',
      name: 'watcher_check_duration_seconds',
      help: 'Duration of watcher checks in seconds',
      labelNames: ['watcher', 'formId'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10],
    });

    metrics.register({
      type: 'counter',
      name: 'fetch_cache_hits_total',
      help: 'Total number of fetch cache hits',
      labelNames: ['watcher'],
    });

    metrics.register({
      type: 'counter',
      name: 'fetch_cache_misses_total',
      help: 'Total number of fetch cache misses',
      labelNames: ['watcher'],
    });

    metrics.register({
      type: 'counter',
      name: 'watcher_errors_total',
      help: 'Total number of watcher errors',
      labelNames: ['watcher', 'formId'],
    });

    metrics.register({
      type: 'counter',
      name: 'watcher_check_errors_total',
      help: 'Total number of watcher check errors',
      labelNames: ['watcher', 'formId', 'error'],
    });
  }
}
