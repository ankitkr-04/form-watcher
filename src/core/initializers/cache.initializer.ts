import { Cache } from '@src/infrastructure/cache';
import { INJECTABLES } from '@src/shared/enums/enums';

import { ValidatedConfig } from '../config/validator.config';
import { Container } from '../service.container';

import { Cleanable, Initializer } from './base-initializer';
export class CacheInitializer implements Initializer, Cleanable {
  private container: Container | null = null;

  constructor(private readonly env: ValidatedConfig) {}

  initialize(container: Container): void {
    this.container = container;

    const cache = new Cache({
      ttl: this.env.CACHE_TTL_MS,
      maxSize: this.env.CACHE_MAX_SIZE,
    });

    container.set(INJECTABLES.CACHE, cache);
  }

  async cleanup(): Promise<void> {
    if (!this.container) return;

    const cache = this.container.get<Cache>(INJECTABLES.CACHE);
    if (cache) {
      cache.clear();
    }

    this.container = null;
  }
}
