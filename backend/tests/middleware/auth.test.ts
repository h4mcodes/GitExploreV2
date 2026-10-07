import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth } from '../../src/middleware/auth.js';
import {
  generateToken,
  revokeToken,
  clearRevokedTokens,
} from '../../src/services/authService.js';
import { UnauthorizedError } from '../../src/types/api.js';

describe('Auth Middleware', () => {
  beforeEach(() => {
    clearRevokedTokens();
  });

  function createMockReq(authHeader?: string): Request {
    return {
      headers: authHeader ? { authorization: authHeader } : {},
    } as unknown as Request;
  }

  function createMockRes(): Response {
    return {} as unknown as Response;
  }

  describe('requireAuth', () => {
    it('authenticates request with valid Bearer token and attaches user payload', () => {
      const token = generateToken({
        userId: 'user-uuid-1',
        username: 'octocat',
        email: 'octocat@github.com',
      });

      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('user-uuid-1');
      expect(req.user?.username).toBe('octocat');
      expect(req.token).toBe(token);
    });

    it('rejects with UnauthorizedError when Authorization header is missing', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTH_REQUIRED');
    });

    it('rejects with UnauthorizedError when Authorization header format is not Bearer', () => {
      const req = createMockReq('Basic dXNlcjpwYXNz');
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.statusCode).toBe(401);
    });

    it('rejects with UnauthorizedError when token is malformed or forged', () => {
      const req = createMockReq('Bearer not-a-valid-jwt-token');
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.statusCode).toBe(401);
    });

    it('rejects with UnauthorizedError when token is revoked', () => {
      const token = generateToken({
        userId: 'user-uuid-2',
        username: 'bob',
        email: 'bob@example.com',
      });

      revokeToken(token);

      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('AUTH_TOKEN_REVOKED');
    });
  });

  describe('optionalAuth', () => {
    it('attaches user identity when a valid Bearer token is provided', () => {
      const token = generateToken({
        userId: 'user-uuid-3',
        username: 'carol',
        email: 'carol@example.com',
      });

      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user?.username).toBe('carol');
      expect(req.token).toBe(token);
    });

    it('proceeds without error when Authorization header is absent', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
    });

    it('proceeds without error when token is invalid or malformed', () => {
      const req = createMockReq('Bearer invalid.jwt.signature');
      const res = createMockRes();
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });
  });
});
