import { CircuitBreaker } from '@src/shared/api-clients/circuit-breaker.api-client';
import { INJECTABLES } from '@src/shared/enums/enums';

import { ValidatedConfig } from '../config/validator.config';
import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class CircuitBreakerInitializer implements Initializer {
  constructor(private readonly env: ValidatedConfig) {}

  initialize(container: Container): void {
    const breaker = new CircuitBreaker({
      timeoutMs: this.env.CB_TIMEOUT_MS,
      failureThreshold: this.env.CB_FAILURE_THRESHOLD,
      successThreshold: this.env.CB_SUCCESS_THRESHOLD,
      name: 'global',
    });

    container.set(INJECTABLES.CIRCUIT_BREAKER, breaker);
  }

  // async cleanup(): Promise<void> {
  //   // No-op for now. Could add metrics flushing or logging if needed later.
  // }
}
