import container from '@src/core/service.container';
import { NotificationPayload } from '@src/shared/types/notification.types';
import { Form } from '@src/shared/types/types';
import { log } from '@src/shared/utils/logger.util';

export interface NotifierStrategy {
  /**
   * Send a notification
   * @param form The form that triggered the notification
   * @param payload The payload to send
   */
  send(form: Form, payload: NotificationPayload): Promise<void>;
}
const notifierKeyMap: Record<string, string> = {
  email: 'emailNotifier',
  discord: 'discordNotifier',
  slack: 'slackNotifier',
};

export const NotifierRegistry = {
  /**
   * Get a notifier strategy by key
   */
  get: (key: string): NotifierStrategy | undefined => {
    const serviceKey = notifierKeyMap[key.toLowerCase()];
    if (!serviceKey) {
      log.warn(`Notifier key mapping not found for: ${key}`);
      return undefined;
    }

    try {
      return container.get<NotifierStrategy>(serviceKey as any); // Assume registered as string keys
    } catch (error) {
      log.warn(`Notifier not found in container: ${serviceKey}`, { error });
      return undefined;
    }
  },

  /**
   * Check if a notifier strategy exists
   */
  has: (key: string): boolean => {
    const serviceKey = notifierKeyMap[key.toLowerCase()];
    return serviceKey ? container.has(serviceKey as any) : false;
  },

  /**
   * Get all registered notifier strategies
   */
  all: (): NotifierStrategy[] => {
    return Object.keys(notifierKeyMap)
      .map((key) => NotifierRegistry.get(key))
      .filter((n): n is NotifierStrategy => n !== undefined);
  },

  /**
   * Backward compatible no-op
   */
  initializeDefaultNotifiers: (): void => {
    log.debug('Notifiers are now initialized via the container');
  },

  /**
   * Backward compatible no-op
   */
  clear: (): void => {
    log.debug('NotifierRegistry.clear() is a no-op when using the container');
  },
};
