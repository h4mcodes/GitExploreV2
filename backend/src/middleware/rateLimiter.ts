import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../types/api.js';

export interface RateLimitOptions {
  /**
   * Time window in milliseconds (default: 60,000ms = 1 minute).
   */
  readonly windowMs?: number;

  /**
   * Maximum allowed requests per key within the window (default: 30).
   */
  readonly max?: number;

  /**
   * Custom error message returned when limit is exceeded.
   */
  readonly message?: string;

  /**
   * Custom error code string (default: 'AI_RATE_LIMIT_EXCEEDED').
   */
  readonly code?: string;

  /**
   * Custom key generator (default: IP address or client identifier).
   */
  readonly keyGenerator?: (req: Request) => string;

  /**
   * Optional function to skip rate limiting for specific requests.
   */
  readonly skip?: (req: Request) => boolean;
}

interface ClientBucket {
  count: number;
  resetTime: number;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;
  const message = options.message ?? 'Too many requests to AI endpoints. Please wait before retrying.';
  const keyGenerator = options.keyGenerator ?? ((req: Request) => {
    // Prefer authenticated user id if present, fallback to IP address
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (userId) return `user:${userId}`;

    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.socket.remoteAddress;
    return ip || '127.0.0.1';
  });

  const buckets = new Map<string, ClientBucket>();

  // Cleanup expired buckets every minute to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetTime) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 30_000));

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (options.skip && options.skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetTime) {
      bucket = {
        count: 1,
        resetTime: now + windowMs,
      };
      buckets.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);
    const resetTimestamp = Math.ceil(bucket.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimestamp);

    if (bucket.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return next(
        new RateLimitError(
          message,
          options.code ?? 'AI_RATE_LIMIT_EXCEEDED',
          { retryAfterSeconds: resetSeconds }
        )
      );
    }

    return next();
  };
}

/**
 * Dedicated rate limiter for expensive AI inference endpoints.
 * Enforces max 30 requests per minute per client by default.
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'AI request limit reached. Please wait a moment before running more analyses.',
  code: 'AI_RATE_LIMIT_EXCEEDED',
});

/**
 * Dedicated rate limiter for GitHub proxy endpoints.
 * Enforces max 60 requests per minute per client by default to protect API quotas.
 */
export const githubRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  message: 'GitHub proxy rate limit reached. Please wait before making more requests.',
  code: 'GITHUB_RATE_LIMIT_EXCEEDED',
});
