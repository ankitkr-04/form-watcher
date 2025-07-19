import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import * as Handlebars from 'handlebars';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { NotFoundError } from '@src/core/custom.errors';

import { NotificationPayload, TemplateData } from '../types/notification.types';

const templatesDir = path.resolve(__dirname, '../../infrastructure/notifiers/templates');

/**
 * Loads, compiles, and renders a Handlebars template.
 * @param templateName The name of the template file (without the .hbs extension).
 * @param data The data to pass to the template.
 * @returns The rendered HTML string.
 * @throws {NotFoundError} If the template file is not found.
 */
export const renderTemplate = (templateName: string, data: unknown): string => {
  const templatePath = path.join(templatesDir, `${templateName}.hbs`);

  if (!fs.existsSync(templatePath)) {
    throw new NotFoundError('Template', templateName);
  }

  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  const compiledTemplate = Handlebars.compile(templateSource);
  const html = compiledTemplate(data);

  return html;
};

export const buildEmailContent = (payload: NotificationPayload): TemplateData => {
  const html = renderTemplate(payload.template, payload.data);

  let subject = '';
  switch (payload.template) {
    case 'change-notification':
      subject = `Form Update: ${payload.data.siteName}`;
      break;
    case 'site-not-working':
      subject = `[Action Required] Site Not Working: ${payload.data.siteName}`;
      break;
    case 'daily-notification-limit-reached':
      subject = `[Notice] Daily Notification Limit Reached for ${payload.data.siteName}`;
      break;
    default:
      subject = 'Form Watcher Notification';
  }

  return { subject, html };
};
