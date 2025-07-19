import { env } from '@src/core/config/env.config';
import { log } from '@src/shared/utils/logger.util';

import { ServiceLifecycleManager } from './core/config/lifecycle.manager.config';
import { CacheInitializer } from './core/initializers/cache.initializer';
import { CircuitBreakerInitializer } from './core/initializers/circuit-breaker.initializer';
import { ContentFetcherInitializer } from './core/initializers/content-fetcher.initializer';
import { HashGeneratorInitializer } from './core/initializers/hash-generator.initializer';
import { HttpClientInitializer } from './core/initializers/http-client.initializer';
import { MetricsInitializer } from './core/initializers/metrics.initializer';
import { NotifiersInitializer } from './core/initializers/notifiers.initializer';
import { RateLimiterInitializer } from './core/initializers/rate-limiter.initializer';
import { RequestDeduplicatorInitializer } from './core/initializers/request-deduplicator.initializer';
import { SecretRotatorInitializer } from './core/initializers/secret-rotation.initializer';
import { WatchersInitializer } from './core/initializers/watchers.initializer';
import { JobScheduler } from './core/schedulers/job.scheduler';
import container from './core/service.container';

// Load environment variables from .env file
async function main() {
  try {
    log.info('Starting application initialization...');
    console.log('Environment:', env.NODE_ENV);

    const initializers = [
      new HttpClientInitializer(env),
      new RateLimiterInitializer(env),
      new CacheInitializer(env),
      new ContentFetcherInitializer(),

      new SecretRotatorInitializer(),
      new RequestDeduplicatorInitializer(),
      new CircuitBreakerInitializer(env),
      new HashGeneratorInitializer(),
      new MetricsInitializer(),
      new NotifiersInitializer(env),
      new WatchersInitializer(),
    ];

    const manager = new ServiceLifecycleManager(container, initializers);
    // Initialize all services
    await manager.initialize();

    log.info('Application started successfully');

    // Start the job scheduler to keep the application running
    JobScheduler.start();
  } catch (error) {
    log.error(
      'Failed to start application',
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  log.error('Unhandled error in main', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
