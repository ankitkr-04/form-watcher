import { Cache } from '@src/infrastructure/cache';
import { INJECTABLES } from '@src/shared/enums/enums';
import { ContentFetcher } from '@src/shared/utils/content.fetcher.util';

import { USER_AGENTS } from '../constants';
import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class ContentFetcherInitializer implements Initializer {
  initialize(container: Container): void {
    const contentFetcher = new ContentFetcher(
      'ContentFetcher',
      container.get<Cache>(INJECTABLES.CACHE),
      USER_AGENTS
    );
    container.set(INJECTABLES.CONTENT_FETCHER, contentFetcher);
  }
}
