import { INJECTABLES } from '@src/shared/enums/enums';
import { HttpClient, HttpClientOptions } from '@src/shared/utils/http.client.util';

import { ValidatedConfig } from '../config/validator.config';
import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class HttpClientInitializer implements Initializer {
  constructor(private readonly env: ValidatedConfig) {}

  initialize(container: Container): void {
    const options: HttpClientOptions = {
      timeout: this.env.HTTP_TIMEOUT_MS,
      maxSockets: this.env.HTTP_MAX_SOCKETS,
      maxFreeSockets: this.env.HTTP_MAX_FREE_SOCKETS,
      keepAliveTimeout: this.env.HTTP_KEEP_ALIVE_MS,
    };

    container.set(INJECTABLES.HTTP_CLIENT, new HttpClient(options));
  }
}
