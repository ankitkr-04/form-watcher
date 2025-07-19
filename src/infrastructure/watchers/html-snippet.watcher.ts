import * as cheerio from 'cheerio';
import { z } from 'zod/v4';

import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { WatcherResult } from '@src/shared/types/types';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';
import { ContentNormalizer } from '@src/shared/utils/content.normalizer.util';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';
import { metrics } from '@src/shared/utils/metrics.util';

import { Cache } from '../cache';

import { BaseWatcher } from './base.watcher';

const watcherConfigSchema = z
  .object({
    selector: z.string().min(1, 'Selector is required for HTML snippet watcher'),
    normalizeOptions: z
      .object({
        stripWhitespace: z.boolean().default(true),
        toLowerCase: z.boolean().default(false),
      })
      .optional()
      .default({ stripWhitespace: true, toLowerCase: false }),
  })
  .strict();

export class HtmlSnippetWatcher extends BaseWatcher {
  constructor(
    circuitBreaker: CircuitBreaker,
    cache: Cache,
    fetcher: ContentFetcher,
    hasher: HashGenerator,
    logger: ErrorLogger
  ) {
    super('HtmlSnippetWatcher', circuitBreaker, cache, fetcher, hasher, logger);
  }

  private validateConfig(config: unknown) {
    return watcherConfigSchema.parse(config);
  }

  private extractSnippet(
    $: cheerio.CheerioAPI,
    selector: string,
    normalizeOptions: { stripWhitespace: boolean; toLowerCase: boolean }
  ): string {
    const snippet = $(selector).text();
    if (!snippet) throw new Error(`Selector '${selector}' did not match any elements`);
    return ContentNormalizer.normalizeText(snippet, normalizeOptions);
  }

  private async determineStatus(
    formId: string,
    currentHash: string
  ): Promise<WatcherResult['status']> {
    const cacheKey = `html_snippet:${formId}:prev_hash`;
    const previousHash = await this.cache.get(cacheKey);
    await this.cache.set(cacheKey, currentHash);
    return previousHash ? (previousHash === currentHash ? 'unchanged' : 'changed') : 'initial';
  }

  protected async executeCheck(form: {
    id: string;
    url: string;
    watcherConfig: unknown;
  }): Promise<WatcherResult> {
    const startTime = Date.now();
    let responseTime = 0;

    try {
      const { selector, normalizeOptions } = this.validateConfig(form.watcherConfig);

      const { content, finalUrl } = await this.fetcher.fetch(form.url);
      responseTime = Date.now() - startTime;
      metrics.histogram('watcher_check_duration_seconds', responseTime / 1000, {
        watcher: this.name,
        formId: form.id,
      });

      const $ = cheerio.load(content);
      const normalized = this.extractSnippet($, selector, normalizeOptions);
      const hash = this.hasher.generate(normalized);
      const status = await this.determineStatus(form.id, hash);

      this.logger.logWatcherInfo(form.id, {
        url: form.url,
        finalUrl,
        responseTime,
        selector,
        status,
        normalizedLength: normalized.length,
      });

      return { status, hash, responseTime };
    } catch (error) {
      responseTime = Date.now() - startTime;

      metrics.histogram('watcher_check_duration_seconds', responseTime / 1000, {
        watcher: this.name,
        formId: form.id,
      });

      const err = error instanceof Error ? error : new Error(String(error));
      const stage = err.message.includes('Selector') ? 'selector' : 'fetch-or-parse';

      if (stage === 'selector') {
        metrics.counter('selectorFailures', 1, { watcher: this.name, formId: form.id });
      }

      this.logger.logWatcherError(form.id, err, {
        url: form.url,
        responseTime,
        stage,
      });

      throw err;
    }
  }
}
