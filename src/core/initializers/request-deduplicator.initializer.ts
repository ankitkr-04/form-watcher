import { requestDeduplicator } from '@src/shared/api-clients/request-deduplicator.api-client';
import { INJECTABLES } from '@src/shared/enums/enums';
import { log } from '@src/shared/utils/logger.util';

import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class RequestDeduplicatorInitializer implements Initializer {
  initialize(container: Container): void {
    container.set(INJECTABLES.REQUEST_DEDUPLICATOR, requestDeduplicator);
    log.debug('RequestDeduplicator registered in container');
  }
}
