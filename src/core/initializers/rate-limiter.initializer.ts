import { INJECTABLES } from '@src/shared/enums/enums';
import { RateLimiter } from '@src/shared/utils/rate.limiter.util';

import { ValidatedConfig } from '../config/validator.config';
import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class RateLimiterInitializer implements Initializer {
  constructor(private readonly env: ValidatedConfig) {}

  initialize(container: Container): void {
    const rateLimiter = new RateLimiter({
      windowMs: this.env.RATE_LIMIT_WINDOW_MS ?? 60_000, // 1 minute default
      max: this.env.RATE_LIMIT_MAX ?? 100, // 100 requests per window default
      throwOnLimit: this.env.RATE_LIMIT_THROW_ON_LIMIT, // Default to false
    });

    container.set(INJECTABLES.RATE_LIMITER, rateLimiter);
  }
}
