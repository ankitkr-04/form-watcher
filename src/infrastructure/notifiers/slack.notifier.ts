import { NotificationPayload } from '@src/shared/types/notification.types';
import { Form } from '@src/shared/types/types';
import { log } from '@src/shared/utils/logger.util';

import { HttpNotifier } from './http.notifier';

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconUrl?: string;
}

export class SlackNotifier extends HttpNotifier {
  protected readonly name = 'SlackNotifier';
  private readonly config: SlackConfig;

  constructor(config: SlackConfig) {
    super();
    this.config = config;

    if (!this.config.webhookUrl) {
      log.warn('Slack webhook URL not configured');
    }
  }

  protected async _send(form: Form, payload: NotificationPayload): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const slackPayload: any = {
      username: this.config.username,
      text: `*Form Update: ${form.name}*\n${payload.data.changeSummary || 'No changes detected'}`,
      attachments: [
        {
          color: '#36a64f',
          fields: [
            {
              title: 'Form',
              value: form.name,
              short: true,
            },
            {
              title: 'URL',
              value: form.url,
              short: true,
            },
          ],
          footer: 'Form Watcher',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    if (this.config.channel) {
      slackPayload.channel = this.config.channel;
    }

    await this.sendHttpRequest(this.config.webhookUrl, slackPayload, form);
  }
}
