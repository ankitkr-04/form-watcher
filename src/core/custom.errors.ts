/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for configuration-related issues
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

/**
 * Error for network-related issues
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly status?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', status || 500, { url, ...details });
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    public readonly id?: string | number,
    details?: Record<string, unknown>
  ) {
    super(`${resource} not found${id ? ` with id ${id}` : ''}`, 'NOT_FOUND', 404, {
      resource,
      id,
      ...details,
    });
  }
}

/**
 * Error for authentication/authorization failures
 */
export class AuthError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, details);
  }
}

/**
 * Error for when a resource already exists
 */
export class ConflictError extends AppError {
  constructor(
    resource: string,
    public readonly id?: string | number,
    details?: Record<string, unknown>
  ) {
    super(`${resource} already exists${id ? ` with id ${id}` : ''}`, 'CONFLICT', 409, {
      resource,
      id,
      ...details,
    });
  }
}

/**
 * Error for when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, {
      retryAfter,
      ...(retryAfter && { 'retry-after': retryAfter.toString() }),
      ...details,
    });
  }
}

/**
 * Error for when an operation times out
 */
export class TimeoutError extends AppError {
  constructor(
    message: string,
    public readonly operation: string,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      'TIMEOUT_ERROR',
      408, // 408 Request Timeout
      {
        operation,
        ...details,
      }
    );
  }
}

/**
 * Error for when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      429, // 429 Too Many Requests
      {
        retryAfter,
        ...(retryAfter && { 'retry-after': retryAfter.toString() }),
        ...details,
      }
    );
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, details);
  }
}
