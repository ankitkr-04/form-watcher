import { Container } from '@src/core/service.container';
import { INJECTABLES } from '@src/shared/enums/enums';
import { WatcherType } from '@src/shared/enums/watcher-type.enum';
import { Watcher } from '@src/shared/types/types';

import { AiTextWatcher } from './ai-text.watcher';
import { GoogleFormWatcher } from './google-form.watcher';
import { HtmlSnippetWatcher } from './html-snippet.watcher';

export * from './ai-text.watcher';
export * from './base.watcher';
export * from './google-form.watcher';
export * from './html-snippet.watcher';

const watcherRegistry = new Map<WatcherType, Watcher>();

export const WatcherRegistry = {
  register: (key: WatcherType, watcher: Watcher): void => {
    watcherRegistry.set(key, watcher);
  },
  get: (key: WatcherType): Watcher | undefined => watcherRegistry.get(key),
  getAll: (): Map<WatcherType, Watcher> => new Map(watcherRegistry),
};

export function registerWatchers(container: Container) {
  WatcherRegistry.register(
    WatcherType.GoogleForm,
    container.get<GoogleFormWatcher>(INJECTABLES.GOOGLE_FORM_WATCHER)
  );

  WatcherRegistry.register(
    WatcherType.HtmlSnippet,
    container.get<HtmlSnippetWatcher>(INJECTABLES.HTML_SNIPPET_WATCHER)
  );

  WatcherRegistry.register(
    WatcherType.AiText,
    container.get<AiTextWatcher>(INJECTABLES.AI_TEXT_WATCHER)
  );
}
