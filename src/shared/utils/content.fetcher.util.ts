import fetch, { RequestInit } from 'node-fetch';

import { NetworkError } from '@src/core/custom.errors';
import { Cache } from '@src/infrastructure/cache';

import { requestDeduplicator } from '../api-clients/request-deduplicator.api-client';
import { FetchResult } from '../types/types';

import { InputValidator } from './input.validator.util';
import { metrics } from './metrics.util';
import { retryOperation } from './retry.util';

export class ContentFetcher {
  private readonly name: string;
  private readonly cache: Cache;
  private readonly userAgents: string[];

  constructor(name: string, cache: Cache, userAgents: string[]) {
    this.name = name;
    this.cache = cache;
    this.userAgents = userAgents;
  }

  /**
   * Fetches content from a URL with caching, deduplication, and retries, returning content and final URL.
   * @param url The URL to fetch.
   * @param options Optional fetch options (excluding signal).
   * @returns An object containing the fetched content and final URL after redirects.
   * @throws NetworkError if the fetch fails or the response is not OK.
   */
  public async fetch(url: string, options: Omit<RequestInit, 'signal'> = {}): Promise<FetchResult> {
    InputValidator.validateUrl(url);
    const cacheKey = `fetch:${url}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      metrics.counter('fetch_cache_hits_total', 1, { watcher: this.name });
      return cached as FetchResult;
    }

    metrics.counter('fetch_cache_misses_total', 1, { watcher: this.name });

    const fetchWithRetry = async (): Promise<FetchResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const fetchOptions: RequestInit = {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': this.randomAgent(),
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.5',
            ...(options.headers || {}),
          },
          redirect: 'follow',
        };
        const res = await fetch(url, fetchOptions);
        clearTimeout(timeout);

        if (!res.ok) {
          throw new NetworkError('Failed to fetch content', url, res.status, {
            status: res.status,
            url,
          });
        }

        const content = await res.text();
        const finalUrl = res.url || url; // Fallback to input URL if res.url is unavailable
        const result: FetchResult = { content, finalUrl };
        await this.cache.set(cacheKey, result);
        return result;
      } catch (e) {
        clearTimeout(timeout);
        throw e;
      }
    };

    return await requestDeduplicator.execute(cacheKey, () =>
      retryOperation(fetchWithRetry, 3, 1000)
    );
  }

  private randomAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}
