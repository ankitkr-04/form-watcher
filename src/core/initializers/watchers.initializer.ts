import { Cache } from '@src/infrastructure/cache';
import {
  AiTextWatcher,
  GoogleFormWatcher,
  HtmlSnippetWatcher,
  registerWatchers,
} from '@src/infrastructure/watchers';
import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { INJECTABLES } from '@src/shared/enums/enums';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';

import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class WatchersInitializer implements Initializer {
  /**
   * Initializes watchers and registers them in the container with unique ErrorLogger instances.
   * @param container The service container for dependency injection.
   * @throws Error if a required dependency is missing or initialization fails.
   */
  initialize(container: Container): void {
    try {
      // Retrieve shared dependencies from the container
      const circuitBreaker = container.get<CircuitBreaker>(INJECTABLES.CIRCUIT_BREAKER);
      const cache = container.get<Cache>(INJECTABLES.CACHE);
      const fetcher = container.get<ContentFetcher>(INJECTABLES.CONTENT_FETCHER);
      const hasher = container.get<HashGenerator>(INJECTABLES.HASH_GENERATOR);

      // Register watchers with unique ErrorLogger instances
      container.set(
        INJECTABLES.GOOGLE_FORM_WATCHER,
        new GoogleFormWatcher(
          circuitBreaker,
          cache,
          fetcher,
          hasher,
          new ErrorLogger('GoogleFormWatcher')
        )
      );

      container.set(
        INJECTABLES.HTML_SNIPPET_WATCHER,
        new HtmlSnippetWatcher(
          circuitBreaker,
          cache,
          fetcher,
          hasher,
          new ErrorLogger('HtmlSnippetWatcher')
        )
      );

      container.set(
        INJECTABLES.AI_TEXT_WATCHER,
        new AiTextWatcher(circuitBreaker, cache, fetcher, hasher, new ErrorLogger('AiTextWatcher'))
      );

      // Register watchers in the registry after they have been initialized
      registerWatchers(container);
    } catch (error) {
      // Log initialization error and rethrow to prevent silent failures

      ErrorLogger.logError('WatchersInitializer', error, {
        message: 'Failed to initialize watchers',
        context: 'WatchersInitializer.initialize',
      });
      throw error;
    }
  }
}
