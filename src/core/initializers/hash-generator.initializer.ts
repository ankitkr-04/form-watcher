import { INJECTABLES } from '@src/shared/enums/enums';
import { HashGenerator } from '@src/shared/utils/hash.generator.util';

import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class HashGeneratorInitializer implements Initializer {
  initialize(container: Container): void {
    container.set(INJECTABLES.HASH_GENERATOR, new HashGenerator());
  }
}
