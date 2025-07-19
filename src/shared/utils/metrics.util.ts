import { EventEmitter } from 'node:events';

import { Request, Response } from 'node-fetch';

import { log } from '@src/shared/utils/logger.util';

type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

interface MetricOptions {
  type: MetricType;
  name: string;
  help?: string;
  labelNames?: string[];
  buckets?: number[]; // For histogram
  percentiles?: number[]; // For summary
  maxAgeSeconds?: number; // For summary
  ageBuckets?: number; // For summary
  pruneAgedBuckets?: boolean; // For summary
}

interface MetricValue {
  labels: Record<string, string>;
  value: number;
  timestamp?: number;
}

interface MetricData {
  type: MetricType;
  help: string;
  values: Map<string, MetricValue>;
  options: Omit<MetricOptions, 'name' | 'type' | 'help'>;
}

/**
 * A simple metrics collector that can be used to track application metrics
 */
export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricData> = new Map();
  private defaultLabels: Record<string, string> = {};

  /**
   * Register a new metric
   */
  register(options: MetricOptions): void {
    if (this.metrics.has(options.name)) {
      throw new Error(`Metric ${options.name} already registered`);
    }

    this.metrics.set(options.name, {
      type: options.type,
      help: options.help || '',
      values: new Map(),
      options: {
        labelNames: options.labelNames || [],
        buckets: options.buckets,
        percentiles: options.percentiles,
        maxAgeSeconds: options.maxAgeSeconds,
        ageBuckets: options.ageBuckets,
        pruneAgedBuckets: options.pruneAgedBuckets,
      },
    });

    log.debug(`Registered metric: ${options.name} (${options.type})`);
  }

  /**
   * Set default labels for all metrics
   */
  setDefaultLabels(labels: Record<string, string>): void {
    this.defaultLabels = { ...labels };
  }

  /**
   * Increment a counter metric
   */
  counter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    this.updateMetric('counter', name, value, labels);
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.updateMetric('gauge', name, value, labels);
  }

  /**
   * Observe a histogram value
   */
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    this.updateMetric('histogram', name, value, labels);
  }

  /**
   * Observe a summary value
   */
  summary(name: string, value: number, labels: Record<string, string> = {}): void {
    this.updateMetric('summary', name, value, labels);
  }

  /**
   * Get all metrics in OpenMetrics format
   */
  generateMetrics(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.metrics.entries()) {
      // Add help text
      if (metric.help) {
        lines.push(`# HELP ${name} ${metric.help}`);
      }

      // Add type
      lines.push(`# TYPE ${name} ${metric.type}`);

      // Add values
      for (const [_labelKey, value] of metric.values.entries()) {
        const labels = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        const metricLine = labels ? `${name}{${labels}} ${value.value}` : `${name} ${value.value}`;

        lines.push(metricLine);
      }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const metric of this.metrics.values()) {
      metric.values.clear();
    }
  }

  /**
   * Get a metric by name
   */
  getMetric(name: string): MetricData | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Map<string, MetricData> {
    return new Map(this.metrics);
  }

  private updateMetric(
    type: MetricType,
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const metric = this.metrics.get(name);

    if (!metric) {
      log.warn(`Metric ${name} not registered`);
      return;
    }

    if (metric.type !== type) {
      log.warn(`Metric ${name} is not a ${type}`);
      return;
    }

    // Merge with default labels
    const allLabels = { ...this.defaultLabels, ...labels };
    const labelKey = this.getLabelKey(allLabels);

    // Get or create the metric value
    const existingValue = metric.values.get(labelKey) || { labels: allLabels, value: 0 };

    // Update the value based on the metric type
    switch (type) {
      case 'counter':
      case 'gauge':
        existingValue.value = type === 'gauge' ? value : existingValue.value + value;
        break;

      case 'histogram':
      case 'summary':
        // For simplicity, we're just tracking the last value
        // In a real implementation, you'd want to track more statistics
        existingValue.value = value;
        break;
    }

    // Update the timestamp
    existingValue.timestamp = Date.now();

    // Store the updated value
    metric.values.set(labelKey, existingValue);

    // Emit an event for the update
    this.emit('metricUpdate', {
      name,
      type,
      value: existingValue.value,
      labels: allLabels,
      timestamp: existingValue.timestamp,
    });
  }

  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
  }
}

// Default metrics collector instance
export const metrics = new MetricsCollector();

// Register default metrics
metrics.register({
  type: 'counter',
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

metrics.register({
  type: 'histogram',
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10],
});

metrics.register({
  type: 'gauge',
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'],
});

// Update memory usage periodically
if (typeof process !== 'undefined') {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    Object.entries(memoryUsage).forEach(([type, value]) => {
      metrics.gauge('nodejs_memory_usage_bytes', value, { type });
    });
  }, 10000).unref(); // Every 10 seconds
}

/**
 * Middleware to track HTTP request metrics
 * Note: node-fetch's Response does not support 'finish' event.
 * You may need to adapt this for your framework (e.g., Express).
 */
export function httpMetricsMiddleware(req: Request, res: Response, next: () => void): void {
  const startTime = process.hrtime();

  // Call next and then track metrics after response is sent
  // This assumes next() returns a Promise or you can wrap response sending logic
  Promise.resolve()
    .then(() => next())
    .finally(() => {
      const duration = process.hrtime(startTime);
      const durationInMs = duration[0] * 1000 + duration[1] / 1e6;

      metrics.counter('http_requests_total', 1, {
        method: req.method,
        path: req.url,
        status: res.status.toString(),
      });

      metrics.histogram('http_request_duration_seconds', durationInMs / 1000, {
        method: req.method,
        path: req.url,
        status: res.status.toString(),
      });
    });
}
