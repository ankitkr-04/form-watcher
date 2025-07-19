import * as Nodemailer from 'nodemailer';

import { ValidationError } from '@src/core/custom.errors';
import { NotificationPayload } from '@src/shared/types/notification.types';
import { Form } from '@src/shared/types/types';
import { ErrorLogger } from '@src/shared/utils/error.logger.util';
import { log } from '@src/shared/utils/logger.util';
import { buildEmailContent } from '@src/shared/utils/template.util';

import { BaseNotifier } from './base.notifier';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
  secure?: boolean;
}

export class EmailNotifier extends BaseNotifier {
  protected readonly name = 'EmailNotifier';
  private transporter: Nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    super();
    this.config = {
      ...config,
      from: config.from || config.user,
      secure: config.secure ?? config.port === 465,
    };
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const nodemailer = await import('nodemailer');
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      from: this.config.from,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    // Verify connection configuration
    try {
      await this.transporter.verify();
      log.info('SMTP connection verified');
    } catch (error) {
      log.error(
        'SMTP connection failed',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  protected async _send(form: Form, payload: NotificationPayload): Promise<void> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    // Get the first notifier with email configuration
    const emailNotifier = form.notifiers?.find(
      (n) => n.strategy === 'email' && n.enabled !== false
    );
    const recipient = emailNotifier?.emailTo?.[0];

    if (!recipient) {
      ErrorLogger.logError(
        'No recipient email address configured',
        new Error('No recipient email address configured')
      );
      throw new ValidationError('No recipient email address configured');
    }

    const { subject, html } = buildEmailContent(payload);

    const mailOptions = {
      from: `"Form Watcher" <${this.config.from || this.config.user}>`,
      to: recipient,
      subject,
      html,
    };

    try {
      const info = await this.transporter?.sendMail(mailOptions);
      log.debug(`Email sent: ${info?.messageId}`, {
        messageId: info?.messageId,
        response: info?.response,
      });
    } catch (error) {
      ErrorLogger.logError('Failed to send email', error);
      // Reset transporter on error to force reinitialization on next attempt
      this.transporter = null;
      throw error;
    }
  }
}
