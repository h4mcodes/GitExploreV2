import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
} from '../../src/types/api.js';

describe('Error Handling Middleware', () => {
  function createMockReq(method: string = 'GET', url: string = '/api/test'): Request {
    return {
      method,
      originalUrl: url,
    } as unknown as Request;
  }

  function createMockRes(): Response & {
    statusCode: number;
    body: Record<string, unknown>;
  } {
    const res = {
      statusCode: 200,
      body: {},
      status: vi.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      json: vi.fn((data: Record<string, unknown>) => {
        res.body = data;
        return res;
      }),
    };
    return res as unknown as Response & {
      statusCode: number;
      body: Record<string, unknown>;
    };
  }

  describe('errorHandler', () => {
    it('serializes BadRequestError with 400 status code and code string', () => {
      const err = new BadRequestError('Invalid input parameter', 'INVALID_PARAM', { field: 'name' });
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: 'Invalid input parameter',
        code: 'INVALID_PARAM',
        details: { field: 'name' },
      });
    });

    it('serializes NotFoundError with 404 status code', () => {
      const err = new NotFoundError('User not found', 'USER_NOT_FOUND');
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('User not found');
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('serializes UnauthorizedError with 401 status code', () => {
      const err = new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('serializes ForbiddenError with 403 status code', () => {
      const err = new ForbiddenError('Access forbidden');
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('serializes ConflictError with 409 status code', () => {
      const err = new ConflictError('User already exists', 'USER_EXISTS');
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('USER_EXISTS');
    });

    it('serializes RateLimitError with 429 status code and details', () => {
      const err = new RateLimitError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfter: 30 });
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(429);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.details).toEqual({ retryAfter: 30 });
    });

    it('catches body-parser JSON syntax errors with 400 INVALID_JSON', () => {
      const syntaxErr = new SyntaxError('Unexpected token in JSON at position 4');
      (syntaxErr as unknown as { status: number }).status = 400;

      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(syntaxErr, req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_JSON');
    });

    it('handles unexpected generic Error with 500 INTERNAL_SERVER_ERROR', () => {
      const err = new Error('Database connection crashed');
      const req = createMockReq();
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(err, req, res, next);

      expect(res.statusCode).toBe(500);
      expect(res.body.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('notFoundHandler', () => {
    it('returns 404 with ROUTE_NOT_FOUND and requested path', () => {
      const req = createMockReq('POST', '/api/nonexistent-endpoint');
      const res = createMockRes();

      notFoundHandler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'Cannot POST /api/nonexistent-endpoint',
        code: 'ROUTE_NOT_FOUND',
      });
    });
  });
});
