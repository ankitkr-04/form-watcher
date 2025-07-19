import { log } from '@src/shared/utils/logger.util';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface RequestDeduplicatorOptions {
  /**
   * Maximum age of a pending request in milliseconds
   * @default 30000 (30 seconds)
   */
  maxAge?: number;

  /**
   * Cleanup interval in milliseconds
   * @default 60000 (1 minute)
   */
  cleanupInterval?: number;

  /**
   * Whether to log debug information
   * @default false
   */
  debug?: boolean;
}

/**
 * A utility for deduplicating in-flight requests
 */
export class RequestDeduplicator<T = any> {
  private pendingRequests: Map<string, PendingRequest<T>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly options: Required<RequestDeduplicatorOptions>;

  constructor(options: RequestDeduplicatorOptions = {}) {
    this.options = {
      maxAge: options.maxAge ?? 30000, // 30 seconds
      cleanupInterval: options.cleanupInterval ?? 60000, // 1 minute
      debug: options.debug ?? false,
    };

    this.startCleanup();
  }

  /**
   * Execute a function with deduplication
   * @param key A unique key for the request
   * @param fn The function to execute
   * @returns The result of the function
   */
  async execute(key: string, fn: () => Promise<T>): Promise<T> {
    // Check for an existing pending request
    const existing = this.pendingRequests.get(key);

    if (existing) {
      if (this.options.debug) {
        log.debug(`Deduplicating request: ${key}`);
      }
      return existing.promise;
    }

    // Create a new promise for this request
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // Store the pending request
    const pendingRequest: PendingRequest<T> = {
      promise,
      timestamp: Date.now(),
    };

    this.pendingRequests.set(key, pendingRequest);

    if (this.options.debug) {
      log.debug(`Starting new request: ${key}`);
    }

    try {
      // Execute the function
      const result = await fn();

      // Resolve the promise with the result
      resolve!(result);

      if (this.options.debug) {
        log.debug(`Request completed: ${key}`);
      }

      return result;
    } catch (error) {
      // Reject the promise with the error
      reject!(error);

      if (this.options.debug) {
        log.error(
          `Request failed: ${key}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }

      throw error;
    } finally {
      // Remove the pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval).unref();
  }

  /**
   * Clean up old pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.options.maxAge) {
        this.pendingRequests.delete(key);
        removed++;
      }
    }

    if (this.options.debug && removed > 0) {
      log.debug(`Cleaned up ${removed} stale pending requests`);
    }
  }

  /**
   * Get the number of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Default instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Decorator to deduplicate method calls
 */
export function deduplicate(keyFn: (...args: any[]) => string = (...args) => JSON.stringify(args)) {
  const deduplicator = new RequestDeduplicator();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}:${keyFn(...args)}`;
      return deduplicator.execute(key, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
