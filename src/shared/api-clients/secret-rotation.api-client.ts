import EventEmitter from 'events';

import { ConfigurationError, NotFoundError } from '@src/core/custom.errors';
import container from '@src/core/service.container';
import { log } from '@src/shared/utils/logger.util';

import { INJECTABLES } from '../enums/enums';

type SecretValue = string | Buffer | Record<string, unknown>;

interface SecretOptions {
  /**
   * Unique identifier for the secret
   */
  id: string;

  /**
   * Current secret value
   */
  current: SecretValue;

  /**
   * Previous secret value (for rollback)
   */
  previous?: SecretValue;

  /**
   * Function to refresh the secret
   */
  refreshFn?: () => Promise<SecretValue> | SecretValue;

  /**
   * Refresh interval in milliseconds
   * @default 3600000 (1 hour)
   */
  refreshInterval?: number;

  /**
   * Whether to automatically refresh the secret
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Maximum number of retries on refresh failure
   * @default 3
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   * @default 5000 (5 seconds)
   */
  retryDelay?: number;
}

interface SecretRotationEvents {
  refresh: (secret: SecretValue) => void;
  'refresh:success': (secret: SecretValue) => void;
  'refresh:error': (error: Error) => void;
  rotate: (current: SecretValue, previous: SecretValue) => void;
  error: (error: Error) => void;
}

/**
 * A utility for managing and rotating secrets
 */
export class SecretRotator extends EventEmitter {
  private secrets: Map<string, SecretOptions> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a new secret
   */
  register(options: SecretOptions): void {
    if (this.secrets.has(options.id)) {
      log.warn(`Secret with id '${options.id}' already exists, updating`);
    }

    this.secrets.set(options.id, {
      ...options,
      autoRefresh: options.autoRefresh ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 5000,
    });

    // Start auto-refresh if enabled
    if (options.autoRefresh !== false && options.refreshFn) {
      this.scheduleRefresh(
        options.id,
        options.refreshInterval ?? 3600000 // 1 hour
      );
    }

    log.info(`Registered secret: ${options.id}`);
  }

  /**
   * Get a secret by ID
   */
  getSecret(id: string): SecretValue | undefined {
    return this.secrets.get(id)?.current;
  }

  /**
   * Rotate a secret to a new value
   */
  async rotate(id: string, newValue: SecretValue): Promise<void> {
    const secret = this.secrets.get(id);
    if (!secret) {
      throw new Error(`Secret with id '${id}' not found`);
    }

    const previous = secret.current;
    secret.previous = previous;
    secret.current = newValue;

    this.emit('rotate', newValue, previous);
    log.info(`Rotated secret: ${id}`);
  }

  /**
   * Refresh a secret using its refresh function
   */
  async refresh(id: string): Promise<SecretValue> {
    const secret = this.secrets.get(id);
    if (!secret) {
      throw new NotFoundError('Secret', id);
    }

    if (!secret.refreshFn) {
      throw new ConfigurationError(`No refresh function defined for secret: ${id}`);
    }

    let lastError: Error | null = null;
    const maxRetries = secret.maxRetries ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.emit('refresh', secret.current);
        log.debug(`Refreshing secret: ${id} (attempt ${attempt}/${maxRetries})`);

        const newValue = await secret.refreshFn();

        // Rotate to the new secret
        await this.rotate(id, newValue);

        this.emit('refresh:success', newValue);
        log.info(`Successfully refreshed secret: ${id}`);

        return newValue;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        lastError = errorObj;
        log.error(`Failed to refresh secret ${id} (attempt ${attempt}/${maxRetries}):`, errorObj);
        this.emit('refresh:error', errorObj);

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, secret.retryDelay ?? 5000));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error(`Failed to refresh secret: ${id}`);
  }

  /**
   * Schedule automatic refresh of a secret
   */
  private scheduleRefresh(id: string, interval: number): void {
    // Clear any existing interval
    this.clearRefresh(id);

    // Set up the new interval
    const intervalId = setInterval(async () => {
      try {
        await this.refresh(id);
      } catch (error) {
        log.error(
          `Failed to refresh secret ${id}:`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, interval);

    // Unref to prevent the interval from keeping the process alive
    intervalId.unref();

    // Store the interval ID
    this.refreshIntervals.set(id, intervalId);
    log.debug(`Scheduled refresh for secret ${id} every ${interval}ms`);
  }

  /**
   * Clear the refresh interval for a secret
   */
  clearRefresh(id: string): void {
    const intervalId = this.refreshIntervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(id);
      log.debug(`Cleared refresh for secret: ${id}`);
    }
  }

  private cleanup(): void {
    for (const [id, intervalId] of this.refreshIntervals.entries()) {
      clearInterval(intervalId);
      log.debug(`Cleaned up refresh interval for secret: ${id}`);
    }
    this.refreshIntervals.clear();
  }

  /**
   * Stop all secret refreshes and clean up
   */
  stop(): void {
    this.cleanup();
    this.secrets.clear();
    log.info('Stopped all secret rotations');
  }

  // Type-safe event emitter methods
  on<T extends keyof SecretRotationEvents>(event: T, listener: SecretRotationEvents[T]): this {
    return super.on(event, listener);
  }

  once<T extends keyof SecretRotationEvents>(event: T, listener: SecretRotationEvents[T]): this {
    return super.once(event, listener);
  }

  emit<T extends keyof SecretRotationEvents>(
    event: T,
    ...args: Parameters<SecretRotationEvents[T]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

/**
 * Decorator to automatically inject a secret into a class property
 */
export function Secret(secretId: string): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const secretRotator = container.get<SecretRotator>(INJECTABLES.SECRET_ROTATOR);
    // Property getter
    const getter = function () {
      const value = secretRotator.getSecret(secretId);
      if (value === undefined) {
        throw new NotFoundError('Secret', String(secretId));
      }
      return value;
    };

    // Replace the property with the getter
    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true,
    });
  };
}
