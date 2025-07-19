export type NotificationTemplate =
  | 'change-notification'
  | 'site-not-working'
  | 'daily-notification-limit-reached';

export interface TemplateData {
  subject: string;
  html: string;
}

export interface NotificationPayload {
  template: NotificationTemplate;
  data: {
    siteName: string;
    url: string;
    changeSummary?: string;
    status?: 'open' | 'closed' | 'unknown';
  };
}
