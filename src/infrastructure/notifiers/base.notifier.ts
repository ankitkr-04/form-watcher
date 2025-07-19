import { NotificationPayload } from '@src/shared/types/notification.types';
import { Form } from '@src/shared/types/types';
import { log } from '@src/shared/utils/logger.util';

import { NotifierStrategy } from './strategy.notifier';

export abstract class BaseNotifier implements NotifierStrategy {
  protected abstract readonly name: string;

  async send(form: Form, payload: NotificationPayload): Promise<void> {
    const startTime = Date.now();

    try {
      await this._send(form, payload);
      log.info(`Notification sent via ${this.name} for form ${form.id}`, {
        formId: form.id,
        notifier: this.name,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      log.error(
        `Failed to send ${this.name} notification for form ${form.id}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          formId: form.id,
          notifier: this.name,
          durationMs: Date.now() - startTime,
        }
      );
      throw error;
    }
  }

  protected abstract _send(form: Form, payload: NotificationPayload): Promise<void>;
}
