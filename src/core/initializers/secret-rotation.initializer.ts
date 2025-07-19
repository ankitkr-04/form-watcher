import { SecretRotator } from '@src/shared/api-clients/secret-rotation.api-client';
import { INJECTABLES } from '@src/shared/enums/enums';
import { log } from '@src/shared/utils/logger.util';

import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class SecretRotatorInitializer implements Initializer {
  initialize(container: Container): void {
    // Register the singleton instance
    container.set(INJECTABLES.SECRET_ROTATOR, new SecretRotator());

    log.debug('SecretRotator registered in container');
  }
}
