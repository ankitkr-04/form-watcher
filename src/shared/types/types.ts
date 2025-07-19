// ┌── src/types.ts
/**
 * @description Shared types and interfaces
 */

export interface Form {
  id: string;
  name: string;
  url: string;
  watcherType: 'google-form' | 'html-snippet' | 'ai-text';
  watcherConfig: Record<string, unknown>;
  intervalSeconds: number;
  cronSchedule?: string;
  startDate: string;
  endDate: string;
  weekdays: string[];
  activeFrom: string;
  activeTo: string;
  enabled: boolean;
  priority: number;
  lastCheckedAt?: string;
  lastStatus?: string;
  lastHash?: string;
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  notifiers?: Notifier[];
}

export interface Notifier {
  id: string;
  formId: string;
  strategy: 'email' | 'discord' | 'slack';
  emailTo?: string[];
  webhookUrl?: string;
  notificationEmail?: string;
  customVars: Record<string, unknown>;
  enabled?: boolean;
  retryCount?: number;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormHistory {
  id: string;
  formId: string;
  status: string;
  hash?: string;
  responseTime?: number;
  checkedAt: string;
}

export interface WatcherResult {
  status: 'open' | 'closed' | 'changed' | 'unchanged' | 'initial';
  hash?: string;
  responseTime: number;
}

export interface Metrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  avgResponseTime: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  environment: string;
  uptime: number;
  activeForms: number;
  metrics: Metrics;
  timestamp: string;
}

// Form configuration for watchers
export interface FormConfig {
  id: string;
  url: string;
  watcherType: string;
  watcherConfig: Record<string, unknown>;
  [key: string]: unknown;
}

// Watcher interfaces
export interface Watcher {
  check(_form: Form): Promise<WatcherResult>;
}

// Configuration interfaces
export interface GoogleFormConfig {
  closedText?: string;
}

export interface HtmlSnippetConfig {
  selector: string;
}

export interface AiTextConfig {
  regex: string;
}

export type FormWithNotifiers = Form;

export interface FetchResult {
  content: string;
  finalUrl: string;
}
