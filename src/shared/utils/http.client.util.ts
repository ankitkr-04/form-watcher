import { Agent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

import fetch, { Headers, RequestInit } from 'node-fetch';

import {
  ConfigurationError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from '@src/core/custom.errors';

import { log } from './logger.util';

// Extend the global RequestInit type to include the agent property
declare global {
  interface RequestInit {
    agent?: (parsedUrl: URL) => Agent | HttpsAgent;
  }
}

export interface HttpClientOptions {
  /**
   * Request timeout in milliseconds
   * @default 10000 (10 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of sockets to allow per host
   * @default 50
   */
  maxSockets?: number;

  /**
   * Maximum number of free sockets to keep open
   * @default 10
   */
  maxFreeSockets?: number;

  /**
   * Keep-alive timeout in milliseconds
   * @default 60000 (1 minute)
   */
  keepAliveTimeout?: number;
}

/**
 * Creates a configured HTTP/HTTPS agent with connection pooling
 */
export class HttpClient {
  private readonly httpAgent: Agent;
  private readonly httpsAgent: HttpsAgent;
  private readonly timeout: number;

  constructor(options: HttpClientOptions = {}) {
    this.timeout = options.timeout ?? 10000; // 10 seconds

    const poolConfig = {
      maxSockets: options.maxSockets ?? 50,
      maxFreeSockets: options.maxFreeSockets ?? 10,
      timeout: options.keepAliveTimeout ?? 60000, // 1 minute
      keepAlive: true,
    };

    this.httpAgent = new Agent({
      ...poolConfig,
      keepAliveMsecs: poolConfig.timeout,
    });

    this.httpsAgent = new HttpsAgent({
      ...poolConfig,
      keepAliveMsecs: poolConfig.timeout,
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    });
  }

  /**
   * Make an HTTP/HTTPS request with timeout and retry logic
   */
  async request<T = any>(
    url: string | URL,
    options: RequestInit = {},
    timeout: number = this.timeout
  ): Promise<{ status: number; data: T; headers: Headers }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Create a new URL object to parse the URL if it's a string
      const parsedUrl = typeof url === 'string' ? new URL(url) : url;

      // Use type assertion to include the agent property
      const fetchOptions: RequestInit & { agent?: (parsedUrl: URL) => Agent | HttpsAgent } = {
        ...options,
        signal: controller.signal,
        agent: () => (parsedUrl.protocol === 'https:' ? this.httpsAgent : this.httpAgent),
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = `HTTP request failed with status ${response.status}`;
        const errorDetails = {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
        };

        log.error(errorMessage, new Error(errorMessage), {
          ...errorDetails,
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new RateLimitError(
            'Rate limit exceeded',
            retryAfter ? parseInt(retryAfter, 10) : undefined,
            errorDetails
          );
        }

        if (response.status >= 500) {
          throw new NetworkError(
            `Server error: ${response.status} ${response.statusText}`,
            response.url,
            response.status,
            errorDetails
          );
        }

        if (response.status >= 400) {
          throw new ValidationError(
            `Client error: ${response.status} ${response.statusText}`,
            'request',
            errorDetails
          );
        }

        throw new NetworkError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.url,
          response.status,
          errorDetails
        );
      }

      const data = (await response.json().catch(() => ({}))) as T;
      return {
        status: response.status,
        data,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${timeout}ms`, 'http_request', {
            url: typeof url === 'string' ? url : url.toString(),
          });
        }

        if (
          error instanceof NetworkError ||
          error instanceof RateLimitError ||
          error instanceof ValidationError
        ) {
          throw error; // Re-throw our custom errors
        }

        // Wrap other errors in a NetworkError
        throw new NetworkError(
          error.message,
          typeof url === 'string' ? url : url.toString(),
          undefined,
          { cause: error }
        );
      }

      throw new NetworkError(
        'An unknown error occurred during the request',
        typeof url === 'string' ? url : url.toString()
      );
    }
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    url: string | URL,
    options: Omit<RequestInit, 'method'> = {},
    timeout?: number
  ): Promise<{ status: number; data: T; headers: Headers }> {
    return this.request<T>(url, { ...options, method: 'GET' }, timeout);
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    url: string | URL,
    body: unknown,
    options: Omit<RequestInit, 'method' | 'body'> = {},
    timeout?: number
  ): Promise<{ status: number; data: T; headers: Headers }> {
    const headers = new Headers(options.headers);
    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return this.request<T>(
      url,
      {
        ...options,
        method: 'POST',
        headers,
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
      timeout
    );
  }
}

/**
 * Validates that all required HTTP client environment variables are set
 * @throws {ConfigurationError} If required environment variables are missing
 */
export function validateHttpClientConfig(): void {
  if (!process.env.HTTP_TIMEOUT_MS) {
    throw new ConfigurationError('HTTP_TIMEOUT_MS environment variable is required');
  }

  const timeout = parseInt(process.env.HTTP_TIMEOUT_MS, 10);
  if (isNaN(timeout) || timeout <= 0) {
    throw new ConfigurationError('HTTP_TIMEOUT_MS must be a positive number');
  }
}

// Validate configuration at module load time
try {
  validateHttpClientConfig();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('HTTP Client configuration error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
  throw error;
}
