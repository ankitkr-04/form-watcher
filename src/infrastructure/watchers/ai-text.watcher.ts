import { ConfigurationError } from '@src/core/custom.errors';
import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { Form, WatcherResult } from '@src/shared/types/types';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';
import { ContentNormalizer } from '@src/shared/utils/content.normalizer.util';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';
import { InputValidator } from '@src/shared/utils/input.validator.util';

import { Cache } from '../cache';

import { BaseWatcher } from './base.watcher';

/**
 * Watcher that monitors web pages for presence/absence of specific text patterns via RegExp.
 * Use cases: change detection, content monitoring, integrity verification, AI moderation triggers, etc.
 */
export class AiTextWatcher extends BaseWatcher {
  constructor(
    circuitBreaker: CircuitBreaker,
    cache: Cache,
    fetcher: ContentFetcher,
    hasher: HashGenerator,
    logger: ErrorLogger
  ) {
    super('AiTextWatcher', circuitBreaker, cache, fetcher, hasher, logger);
  }

  /**
   * Executes pattern-matching logic for a given form's URL and RegExp.
   * Returns a `WatcherResult` indicating detection outcome and metadata.
   */
  protected async executeCheck(form: Form): Promise<WatcherResult> {
    const startTime = Date.now();
    let responseTime = 0;

    try {
      const config = form.watcherConfig as { regex?: string };
      if (!config?.regex) {
        throw new ConfigurationError('Missing required "regex" pattern in watcherConfig');
      }

      // Validate regex pattern before use
      InputValidator.validateRegex(config.regex);

      // Fetch HTML content from target URL
      const { content } = await this.fetcher.fetch(form.url);
      responseTime = Date.now() - startTime;

      // Normalize HTML (e.g., strip scripts, collapse whitespace, etc.)
      const normalizedContent = ContentNormalizer.normalizeHtml(content);

      const pattern = new RegExp(config.regex, 'i'); // case-insensitive by default
      const isMatch = pattern.test(normalizedContent);

      return {
        status: isMatch ? 'open' : 'closed',
        hash: this.hasher.generate(normalizedContent),
        responseTime,
      };
    } catch (error) {
      responseTime = Date.now() - startTime;

      this.logger.logWatcherError(form.id, error, {
        url: form.url,
        responseTime,
        formId: form.id,
      });

      throw error;
    }
  }
}
