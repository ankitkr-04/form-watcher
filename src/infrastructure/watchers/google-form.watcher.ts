import * as cheerio from 'cheerio';

import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { Form, WatcherResult } from '@src/shared/types/types';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';
import { ContentNormalizer } from '@src/shared/utils/content.normalizer.util';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';
import { log } from '@src/shared/utils/logger.util';

import { Cache } from '../cache';

import { BaseWatcher } from './base.watcher';
export class GoogleFormWatcher extends BaseWatcher {
  private readonly defaultFormClosedText = 'no longer accepting responses';
  private readonly closedFormPath = '/closedform';

  constructor(
    circuitBreaker: CircuitBreaker,
    cache: Cache,
    fetcher: ContentFetcher,
    hasher: HashGenerator,
    logger: ErrorLogger
  ) {
    super('GoogleFormWatcher', circuitBreaker, cache, fetcher, hasher, logger);
  }

  /**
   * Checks if the form is closed by looking for a configurable closure message.
   * @param normalizedHtml The normalized HTML content of the form.
   * @param form The form configuration, including optional closedText.
   * @returns True if the closure text is found, indicating the form is closed.
   */
  private checkTextBasedClosure(normalizedHtml: string, form: Form): boolean {
    const closedText =
      (form.watcherConfig as { closedText?: string })?.closedText || this.defaultFormClosedText;
    return normalizedHtml.includes(closedText);
  }

  /**
   * Checks if the form is closed by analyzing HTML elements (e.g., missing inputs or submit button).
   * @param $ Cheerio Root instance with loaded HTML.
   * @returns True if no enabled inputs or submit button are found, indicating the form is closed.
   */
  private checkElementBasedClosure($: cheerio.CheerioAPI): boolean {
    const hasEnabledInputs = $('input:not([disabled]), textarea:not([disabled])').length > 0;
    const hasSubmitButton = $('button[type="submit"]').length > 0;
    return !hasEnabledInputs || !hasSubmitButton;
  }

  /**
   * Checks if the form is closed by analyzing the final URL path.
   * @param finalUrl The resolved URL after redirects.
   * @returns True if the URL ends with /closedform, indicating the form is closed.
   */
  private checkUrlBasedClosure(finalUrl: string): boolean {
    const parsedUrl = new URL(finalUrl);
    return parsedUrl.pathname.endsWith(this.closedFormPath);
  }

  /**
   * Checks if a Google Form is open or closed using multiple detection logics:
   * - Configurable closure text
   * - HTML element analysis (inputs, submit button)
   * - URL path analysis (/closedform)
   * @param form The form configuration, including optional closedText in watcherConfig.
   * @returns Watcher result with status, hash, and response time.
   * @throws Error if fetching or parsing fails.
   */
  protected async executeCheck(form: Form): Promise<WatcherResult> {
    const startTime = Date.now();
    let responseTime = 0;

    try {
      // Fetch content and final URL after redirects
      const { content: html, finalUrl } = await this.fetcher.fetch(form.url);
      responseTime = Date.now() - startTime;

      const normalized = ContentNormalizer.normalizeHtml(html);
      const $ = cheerio.load(html);

      // Execute detection logics
      const textBasedIsClosed = this.checkTextBasedClosure(normalized, form);
      const elementBasedIsClosed = this.checkElementBasedClosure($);
      const urlBasedIsClosed = this.checkUrlBasedClosure(finalUrl);

      // Combine logics: Form is closed if any logic indicates closure
      const isClosed = textBasedIsClosed || elementBasedIsClosed || urlBasedIsClosed;
      const status = isClosed ? 'closed' : 'open';
      const hash = this.hasher.generate(normalized);

      // Log detection details for debugging
      log.info(form.id, {
        url: form.url,
        finalUrl,
        responseTime,
        textBasedIsClosed,
        elementBasedIsClosed,
        urlBasedIsClosed,
        closedTextUsed:
          (form.watcherConfig as { closedText?: string })?.closedText || this.defaultFormClosedText,
      });

      return {
        status,
        hash,
        responseTime,
      };
    } catch (error) {
      responseTime = Date.now() - startTime;
      this.logger.logWatcherError(form.id, error, {
        url: form.url,
        responseTime,
        stage: 'fetch-or-parse',
      });
      throw error;
    }
  }
}
