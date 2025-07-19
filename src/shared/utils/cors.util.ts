import { env } from '@src/core/config/env.config';
import { log } from '@src/shared/utils/logger.util';

// Define strict types for Express request/response
interface Request {
  method?: string;
  headers: {
    origin?: string;
    'access-control-request-headers'?: string;
  };
}

interface Response {
  setHeader(name: string, value: string): this;
  status(code: number): this;
  end(): this;
}

type NextFuntion = (err?: Error) => void;
type RequestHandler = (req: Request, res: Response, next: NextFuntion) => void;

// Simplified CORS optio  ns with strict types
interface CorsOptions {
  origins: string | string[]; // No RegExp or function for simplicity
  methods: string[]; // Array for consistency
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

// Utility to handle errors consistently
const handleCorsError = (error: unknown, next: NextFuntion): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  log.error('CORS middleware error:', err);
  next(err);
};

// Normalize origins to an array
const normalizeOrigins = (origins: string | string[]): string[] =>
  Array.isArray(origins) ? origins : [origins];

// Check if origin is allowed
const isOriginAllowed = (origin: string | undefined, allowedOrigins: string[]): boolean => {
  if (!origin) return true; // Allow requests without origin (e.g., same-origin)
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
};

// Set common CORS headers
const setCorsHeaders = (res: Response, origin: string, options: CorsOptions): void => {
  if (isOriginAllowed(origin, normalizeOrigins(options.origins))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  if (options.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

// Handle preflight requests
const handlePreflight = (req: Request, res: Response, options: CorsOptions): void => {
  res.setHeader('Access-Control-Allow-Methods', options.methods.join(', '));
  if (options.allowedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
  } else if (req.headers['access-control-request-headers']) {
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
  }
  if (options.maxAge) {
    res.setHeader('Access-Control-Max-Age', String(options.maxAge));
  }
  res.status(options.optionsSuccessStatus || 204).end();
};

// Main CORS middleware
export function cors(options: Partial<CorsOptions> = {}): RequestHandler {
  const opts: CorsOptions = {
    origins: options.origins ?? env.CORS_ORIGIN,
    methods: options.methods ?? env.CORS_METHODS,
    allowedHeaders: options.allowedHeaders ?? env.CORS_ALLOWED_HEADERS,
    credentials: options.credentials ?? env.CORS_CREDENTIALS,
    maxAge: options.maxAge ?? env.CORS_MAX_AGE,
    optionsSuccessStatus: options.optionsSuccessStatus,
  };

  return (req, res, next) => {
    const requestOrigin = req.headers.origin || '';

    try {
      if (req.method === 'OPTIONS') {
        setCorsHeaders(res, requestOrigin, opts);
        handlePreflight(req, res, opts);
        return;
      }

      setCorsHeaders(res, requestOrigin, opts);
      next();
    } catch (error) {
      handleCorsError(error, next);
    }
  };
}

// Default CORS middleware with environment-based configuration
export const defaultCors: RequestHandler = cors();

// Simplified preflight middleware
export const corsPreflight: RequestHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    try {
      res.status(200).end();
    } catch (error) {
      handleCorsError(error, next);
    }
    return;
  }
  next();
};
