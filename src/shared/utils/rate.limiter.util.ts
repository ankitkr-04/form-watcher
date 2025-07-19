import { RateLimitError } from '@src/core/custom.errors';

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   * @default 100
   */
  max?: number;

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Whether to throw an error when rate limit is exceeded
   * @default true
   */
  throwOnLimit?: boolean;
}

interface InternalRateLimitOptions {
  maxRequests: number;
  timeWindow: number;
  throwOnLimit: boolean;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

/**
 * A simple rate limiter that tracks requests in memory
 */
export class RateLimiter {
  private readonly options: InternalRateLimitOptions;
  private readonly states: Map<string, RateLimitState> = new Map();

  constructor(options: RateLimitOptions = {}) {
    this.options = {
      maxRequests: options.max ?? 100,
      timeWindow: options.windowMs ?? 60000, // 1 minute
      throwOnLimit: options.throwOnLimit ?? true,
    };
  }

  /**
   * Check if a request is allowed
   * @param key A unique key to identify the rate limit (e.g., IP, user ID, API key)
   * @returns True if the request is allowed, false otherwise
   */
  isAllowed(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
    resetTime: number;
  } {
    const now = Date.now();
    const state = this.states.get(key) || { count: 0, resetTime: now + this.options.timeWindow };

    // Reset the counter if the time window has passed
    if (now > state.resetTime) {
      state.count = 0;
      state.resetTime = now + this.options.timeWindow;
    }

    // Check if the request is allowed
    const remaining = Math.max(0, this.options.maxRequests - state.count);
    const resetTime = state.resetTime;

    return {
      allowed: true,
      remaining,
      resetTime,
      retryAfter: 0,
    };
  }

  /**
   * Execute a function with rate limiting
   * @param key A unique key to identify the rate limit
   * @param fn The function to execute
   * @returns The result of the function
   * @throws {RateLimitError} If the rate limit is exceeded and throwOnLimit is true
   */
  async execute<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const { allowed, retryAfter } = this.isAllowed(key);

    if (!allowed) {
      if (this.options.throwOnLimit) {
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${retryAfter} seconds`,
          retryAfter
        );
      }
      throw new Error('Rate limit exceeded');
    }

    try {
      return await fn();
    } catch (error) {
      // If the error is a rate limit error from the API, update our state
      if (error instanceof RateLimitError && error.retryAfter) {
        const state = this.states.get(key) || { count: 0, resetTime: 0 };
        state.resetTime = Date.now() + error.retryAfter * 1000;
        state.count = this.options.maxRequests; // Mark as rate limited
        this.states.set(key, state);
      }
      throw error;
    }
  }

  /**
   * Get the current rate limit state for a key
   */
  getState(key: string): RateLimitState | undefined {
    return this.states.get(key);
  }

  /**
   * Reset the rate limit for a key
   */
  reset(key: string): void {
    this.states.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.states.clear();
  }
}

// Default rate limiter instance
export const defaultRateLimiter = new RateLimiter({
  max: 100, // 100 requests
  windowMs: 60000, // per minute
  throwOnLimit: true,
});

/**
 * Rate limit decorator for class methods
 */
export function rateLimit(
  options: {
    key?: string | ((...args: any[]) => string);
    maxRequests?: number;
    timeWindow?: number;
  } = {}
): MethodDecorator {
  const rateLimiter = new RateLimiter({
    max: options.maxRequests,
    windowMs: options.timeWindow,
    throwOnLimit: true,
  });

  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = options.key
        ? typeof options.key === 'function'
          ? options.key(...args)
          : options.key
        : 'global';

      const { allowed, retryAfter } = rateLimiter.isAllowed(key);
      if (!allowed && retryAfter !== undefined) {
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${retryAfter} seconds`,
          retryAfter
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
