import { log } from '@src/shared/utils/logger.util';

export interface CacheOptions<T = any> {
  /**
   * Time to live in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;

  /**
   * Maximum number of items to store in the cache
   * @default 100
   */
  maxSize?: number;

  /**
   * Whether to return stale data while fetching fresh data in the background
   * @default false
   */
  staleWhileRevalidate?: boolean;

  /**
   * Function to generate a cache key from the arguments
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Callback when an item is evicted from the cache
   */
  onEvict?: (key: string, value: T) => void;
}

interface CacheItem<T> {
  value: T;
  expiresAt: number;
  lastAccess: number;
  isFetching: boolean;
}

/**
 * A simple in-memory cache with TTL support
 */
export class Cache<T = any> {
  private readonly store = new Map<string, CacheItem<T>>();
  private readonly options: Required<Omit<CacheOptions<T>, 'onEvict' | 'keyGenerator'>> & {
    keyGenerator: (...args: any[]) => string;
    onEvict?: (key: string, value: T) => void;
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions<T> = {}) {
    this.options = {
      ttl: options.ttl ?? 300000, // 5 minutes
      maxSize: options.maxSize ?? 100, // Default max size of 100 items
      staleWhileRevalidate: options.staleWhileRevalidate ?? false,
      keyGenerator: options.keyGenerator ?? ((...args) => JSON.stringify(args)),
      onEvict: options.onEvict,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Start the periodic cleanup of expired items
   */
  private startCleanup(interval: number = 60000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanup();
      } catch (error) {
        log.error(
          'Cache cleanup error:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }, interval).unref();
  }

  /**
   * Stop the cleanup interval
   */
  /**
   * Compares a new value with the existing value for a key and updates it.
   * Returns the status of the comparison.
   * @param key The cache key.
   * @param newValue The new value to compare and set.
   * @returns 'initial' | 'changed' | 'unchanged'
   */
  public async compareAndSet(key: string, newValue: T): Promise<'initial' | 'changed' | 'unchanged'> {
    const previousValue = await this.get(key);
    await this.set(key, newValue);

    if (previousValue === undefined) {
      return 'initial';
    }

    if (JSON.stringify(previousValue) === JSON.stringify(newValue)) {
      return 'unchanged';
    }

    return 'changed';
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove all expired items from the cache
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up expired items first
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt <= now) {
        this.evict(key, item);
      }
    }

    // If we're still over max size, remove the least recently used items
    if (this.store.size > this.options.maxSize) {
      const entries = Array.from(this.store.entries()).sort(
        (a, b) => a[1].lastAccess - b[1].lastAccess
      );

      while (this.store.size > this.options.maxSize && entries.length > 0) {
        const [key, item] = entries.shift()!;
        this.evict(key, item);
      }
    }
  }

  /**
   * Evict an item from the cache
   */
  private evict(key: string, item: CacheItem<T>): void {
    this.store.delete(key);
    if (this.options.onEvict) {
      try {
        this.options.onEvict(key, item.value);
      } catch (error) {
        log.error(
          'Error in onEvict callback:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.options.ttl);

    this.store.set(key, {
      value,
      expiresAt,
      lastAccess: now,
      isFetching: false,
    });
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const now = Date.now();
    const item = this.store.get(key);

    if (!item) {
      return undefined;
    }

    // Check if the item has expired
    if (item.expiresAt <= now) {
      if (!this.options.staleWhileRevalidate || item.isFetching) {
        this.store.delete(key);
        return undefined;
      }
      // Mark as fetching to prevent multiple concurrent fetches
      item.isFetching = true;
      return item.value; // Return stale data while fetching fresh data
    }

    // Update last access time
    item.lastAccess = now;
    return item.value;
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const item = this.store.get(key);
    if (item) {
      this.evict(key, item);
      return true;
    }
    return false;
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    if (this.options.onEvict) {
      for (const [key, item] of this.store.entries()) {
        try {
          this.options.onEvict(key, item.value);
        } catch (error) {
          log.error(
            'Error in onEvict callback during clear:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }
    this.store.clear();
  }

  /**
   * Get the number of items in the cache
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Execute a function with caching
   */
  async wrap<U extends any[] = any[], R = any>(
    fn: (...args: U) => Promise<R> | R,
    keyOrOptions?: string | CacheOptions<R>,
    ...args: U
  ): Promise<R> {
    const options =
      typeof keyOrOptions === 'string' ? { keyGenerator: () => keyOrOptions } : keyOrOptions || {};

    const key = options.keyGenerator
      ? options.keyGenerator(...args)
      : this.options.keyGenerator(...args);

    const cached = this.get(key);
    if (cached !== undefined) {
      return cached as unknown as R; // Add explicit casting
    }

    const result = await fn(...args);
    this.set(key, result as unknown as T, options.ttl); // Add explicit casting
    return result;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
  } {
    let hitCount = 0;
    let missCount = 0;

    for (const item of this.store.values()) {
      if (item.expiresAt > Date.now()) {
        hitCount++;
      } else {
        missCount++;
      }
    }

    const total = hitCount + missCount;
    const hitRate = total > 0 ? hitCount / total : 0;

    return {
      size: this.store.size,
      hitCount,
      missCount,
      hitRate,
    };
  }
}

// Default cache instance
export const defaultCache = new Cache({
  ttl: 300000, // 5 minutes
  maxSize: 100,
  staleWhileRevalidate: true,
});

/**
 * Cache decorator for class methods
 */
export function cache<T = any>(options: CacheOptions<T> = {}): Function {
  const cacheInstance = new Cache<T>(options);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      const cached = cacheInstance.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cacheInstance.set(key, result, options.ttl);
      return result;
    };

    return descriptor;
  };
}
