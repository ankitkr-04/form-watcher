import { NotificationPayload } from '@src/shared/types/notification.types';
import { Form } from '@src/shared/types/types';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { log } from '@src/shared/utils/logger.util';

import { HttpNotifier } from './http.notifier';

export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

const DISCORD_DEFAULT_AVATAR_URL = 'https://i.imgur.com/wSTFkRM.png';
const DISCORD_DEFAULT_USERNAME = 'Form Watcher';

export class DiscordNotifier extends HttpNotifier {
  protected readonly name = 'DiscordNotifier';
  private readonly config: DiscordConfig;

  constructor(config: DiscordConfig) {
    super();
    this.config = {
      ...config,
      username: config.username || DISCORD_DEFAULT_USERNAME,
      avatarUrl: config.avatarUrl || DISCORD_DEFAULT_AVATAR_URL,
    };

    if (!this.config.webhookUrl) {
      log.warn('Discord webhook URL not configured');
    }
  }

  protected async _send(form: Form, payload: NotificationPayload): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const embed = {
      title: `Form Update: ${form.name}`,
      description: payload.data.changeSummary || 'No changes detected',
      url: form.url,
      color: 0x5865f2, // Discord blurple
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Form Watcher',
        icon_url: 'https://i.imgur.com/wSTFkRM.png', // Replace with your icon URL
      },
      fields: [
        {
          name: 'Status',
          value: payload.data.status ? '✅ Open' : '❌ Closed',
          inline: true,
        },
        {
          name: 'Form',
          value: `[${form.name}](${form.url})`,
          inline: true,
        },
      ],
    };

    const discordPayload = {
      username: 'Form Watcher',
      avatar_url: 'https://i.imgur.com/wSTFkRM.png', // Replace with your avatar URL
      embeds: [embed],
    };

    const finalPayload = {
      ...discordPayload,
      username: this.config.username,
      avatar_url: this.config.avatarUrl,
    };

    await this.sendHttpRequest(this.config.webhookUrl, finalPayload, form);
  }
}
