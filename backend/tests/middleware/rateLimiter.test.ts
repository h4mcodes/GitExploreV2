import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../../src/middleware/rateLimiter.js';
import { RateLimitError } from '../../src/types/api.js';

describe('Rate Limiter Middleware', () => {
  function createMockReq(ip: string = '127.0.0.1', userId?: string): Request {
    return {
      headers: {},
      socket: { remoteAddress: ip },
      user: userId ? { id: userId } : undefined,
    } as unknown as Request;
  }

  function createMockRes(): Response & { headers: Record<string, unknown> } {
    const headers: Record<string, unknown> = {};
    return {
      headers,
      setHeader: vi.fn((key: string, val: unknown) => {
        headers[key] = val;
      }),
    } as unknown as Response & { headers: Record<string, unknown> };
  }

  it('allows requests within the configured threshold and sets rate limit headers', () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 3 });
    const req = createMockReq('192.168.1.1');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2);
    expect(res.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('decrements remaining count on successive requests', () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 2 });
    const req = createMockReq('10.0.0.1');

    const res1 = createMockRes();
    const next1 = vi.fn();
    limiter(req, res1, next1);
    expect(res1.headers['X-RateLimit-Remaining']).toBe(1);

    const res2 = createMockRes();
    const next2 = vi.fn();
    limiter(req, res2, next2);
    expect(res2.headers['X-RateLimit-Remaining']).toBe(0);
  });

  it('returns 429 RateLimitError with Retry-After when threshold is exceeded', () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 1 });
    const req = createMockReq('10.0.0.2');

    // First request passes
    const res1 = createMockRes();
    const next1 = vi.fn();
    limiter(req, res1, next1);
    expect(next1).toHaveBeenCalledWith();

    // Second request blocked
    const res2 = createMockRes();
    const next2 = vi.fn();
    limiter(req, res2, next2);

    expect(next2).toHaveBeenCalledTimes(1);
    const error = next2.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('AI_RATE_LIMIT_EXCEEDED');
    expect(res2.headers['Retry-After']).toBeDefined();
  });

  it('uses authenticated userId for rate limit bucket when present', () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 1 });

    const reqUserA = createMockReq('192.168.1.100', 'user_123');
    const reqUserB = createMockReq('192.168.1.100', 'user_456'); // same IP, different user

    const resA1 = createMockRes();
    const nextA1 = vi.fn();
    limiter(reqUserA, resA1, nextA1);
    expect(nextA1).toHaveBeenCalledWith();

    // Second request from user_123 is blocked
    const resA2 = createMockRes();
    const nextA2 = vi.fn();
    limiter(reqUserA, resA2, nextA2);
    expect(nextA2.mock.calls[0]?.[0]).toBeInstanceOf(RateLimitError);

    // Request from user_456 is permitted (different bucket)
    const resB1 = createMockRes();
    const nextB1 = vi.fn();
    limiter(reqUserB, resB1, nextB1);
    expect(nextB1).toHaveBeenCalledWith();
  });

  it('skips rate limiting when skip function returns true', () => {
    const limiter = createRateLimiter({
      windowMs: 10_000,
      max: 1,
      skip: () => true,
    });
    const req = createMockReq('127.0.0.1');

    for (let i = 0; i < 5; i++) {
      const res = createMockRes();
      const next = vi.fn();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledWith();
    }
  });
});
