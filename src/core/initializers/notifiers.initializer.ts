import { DiscordNotifier, EmailNotifier, SlackNotifier } from '@src/infrastructure/notifiers';
import { INJECTABLES } from '@src/shared/enums/enums';

import { ValidatedConfig } from '../config/validator.config';
import { Container } from '../service.container';

import { Initializer } from './base-initializer';

export class NotifiersInitializer implements Initializer {
  constructor(private readonly env: ValidatedConfig) {}

  initialize(container: Container): void {
    this.initializeEmailNotifier(container);
    this.initializeDiscordNotifier(container);
    this.initializeSlackNotifier(container);
  }

  private initializeEmailNotifier(container: Container): void {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = this.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      container.set(
        INJECTABLES.EMAIL_NOTIFIER,
        new EmailNotifier({
          host: SMTP_HOST,
          port: SMTP_PORT,
          user: SMTP_USER,
          pass: SMTP_PASS,
          from: SMTP_FROM,
          secure: SMTP_PORT === 465,
        })
      );
    }
  }

  private initializeDiscordNotifier(container: Container): void {
    const { DISCORD_WEBHOOK_URL } = this.env;
    if (DISCORD_WEBHOOK_URL) {
      container.set(
        INJECTABLES.DISCORD_NOTIFIER,
        new DiscordNotifier({
          webhookUrl: DISCORD_WEBHOOK_URL,
        })
      );
    }
  }

  private initializeSlackNotifier(container: Container): void {
    const { SLACK_WEBHOOK_URL } = this.env;
    if (SLACK_WEBHOOK_URL) {
      container.set(
        INJECTABLES.SLACK_NOTIFIER,
        new SlackNotifier({
          webhookUrl: SLACK_WEBHOOK_URL,
        })
      );
    }
  }
}
