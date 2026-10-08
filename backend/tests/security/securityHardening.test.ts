import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { generateToken } from '../../src/services/authService.js';
import { createRateLimiter } from '../../src/middleware/rateLimiter.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import express, { Express } from 'express';

vi.mock('../../src/github/client.js', () => ({
  githubClient: {
    getUser: vi.fn().mockResolvedValue({
      login: 'octocat',
      id: 1,
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      html_url: 'https://github.com/octocat',
      name: 'The Octocat',
      company: 'GitHub',
      blog: 'https://github.blog',
      location: 'San Francisco',
      email: null,
      bio: null,
      public_repos: 8,
      public_gists: 8,
      followers: 20,
      following: 0,
      created_at: '2011-01-25T18:44:36Z',
      updated_at: '2026-01-01T00:00:00Z',
    }),
  },
}));

describe('D9-P4: Security Hardening Audit & Verification', () => {
  const app = createApp();

  // =========================================================================
  // 1. Security Headers Verification
  // =========================================================================
  describe('1. Security Headers', () => {
    it('sets protective security headers on all responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('sets security headers on 404 routes', async () => {
      const res = await request(app).get('/api/non-existent-route-404');

      expect(res.status).toBe(404);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });
  });

  // =========================================================================
  // 2. CORS Policy & Origin Restrictions
  // =========================================================================
  describe('2. CORS Origin Restrictions', () => {
    it('permits requests from the configured frontend origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('denies CORS headers to unauthorized foreign origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-phishing-site.com');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('permits originless server-to-server and mobile requests', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      // No origin was sent, request succeeds without CORS header
      expect(res.body.status).toBe('ok');
    });
  });

  // =========================================================================
  // 3. Authentication Enforcement on Protected Routes
  // =========================================================================
  describe('3. Protected Route Authentication Enforcement', () => {
    it('enforces auth on GET /api/workspace', async () => {
      const res = await request(app).get('/api/workspace');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('enforces auth on GET /api/investigations', async () => {
      const res = await request(app).get('/api/investigations');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('enforces auth on GET /api/notes', async () => {
      const res = await request(app).get('/api/notes');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('enforces auth on GET /api/bookmarks', async () => {
      const res = await request(app).get('/api/bookmarks');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('enforces auth on GET /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    it('rejects forged token signatures with 401', async () => {
      const validToken = generateToken({ userId: 'u1', username: 'testuser', email: null });
      const [header, payload] = validToken.split('.');
      const forgedToken = `${header}.${payload}.forged_invalid_signature_12345`;

      const res = await request(app)
        .get('/api/workspace')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('rejects expired tokens with 401', async () => {
      const expiredToken = generateToken(
        { userId: 'u1', username: 'testuser', email: null },
        -100 // Expired 100 seconds ago
      );

      const res = await request(app)
        .get('/api/workspace')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_TOKEN_EXPIRED');
    });
  });

  // =========================================================================
  // 4. Rate Limiting Active on Expensive Endpoints
  // =========================================================================
  describe('4. Rate Limiting Active on AI & GitHub Proxy Endpoints', () => {
    it('sets standard rate limit headers on AI endpoints', async () => {
      const res = await request(app).get('/api/ai/status');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('30');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('sets standard rate limit headers on GitHub proxy endpoints', async () => {
      const res = await request(app).get('/api/github/users/octocat');

      expect(res.headers['x-ratelimit-limit']).toBe('60');
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('blocks rapid requests when threshold is exceeded with 429 and Retry-After', async () => {
      // Test isolated limiter instance with small max to verify blocking behavior
      const testLimiter = createRateLimiter({
        windowMs: 5_000,
        max: 2,
        message: 'Rate limit test threshold exceeded',
        code: 'GITHUB_RATE_LIMIT_EXCEEDED',
      });

      const testApp: Express = express();
      testApp.use(testLimiter);
      testApp.get('/test-limit', (_req, res) => res.json({ ok: true }));
      testApp.use(errorHandler);

      // Request 1: OK
      const res1 = await request(testApp).get('/test-limit');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-ratelimit-remaining']).toBe('1');

      // Request 2: OK
      const res2 = await request(testApp).get('/test-limit');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-ratelimit-remaining']).toBe('0');

      // Request 3: Exceeded -> 429 RateLimitError
      const res3 = await request(testApp).get('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body.code).toBe('GITHUB_RATE_LIMIT_EXCEEDED');
      expect(res3.headers['retry-after']).toBeDefined();
    });
  });

  // =========================================================================
  // 5. Input Validation on Hostile / Malformed Inputs
  // =========================================================================
  describe('5. Input Validation Hardening', () => {
    it('rejects hostile GitHub username with directory traversal attempt', async () => {
      const res = await request(app).get('/api/github/users/..%2f..%2fetc%2fpasswd');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'validuser', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with malformed username format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user@name!', password: 'ValidPassword123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid JSON payloads with 400 INVALID_JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json: true, ');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_JSON');
    });
  });
});
