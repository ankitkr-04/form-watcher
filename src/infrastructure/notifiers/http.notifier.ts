import { Form } from '@src/shared/types/types';
import { handleError } from '@src/shared/utils/error.handler.util';
import { retryOperation } from '@src/shared/utils/retry.util';
import { log } from '@src/shared/utils/logger.util';

import { BaseNotifier } from './base.notifier';

export abstract class HttpNotifier extends BaseNotifier {
  protected async sendHttpRequest(
    url: string,
    payload: any,
    form: Form
  ): Promise<void> {
    return handleError(
      () =>
        retryOperation(async () => {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${await response.text()}`);
          }

          log.debug(`${this.name} notification sent`, { formId: form.id, status: response.status });
        }),
      { formId: form.id, notifier: this.name, stage: 'notification-send' }
    );
  }
}
