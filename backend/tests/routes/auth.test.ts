import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import {
  hashPassword,
  clearRevokedTokens,
} from '../../src/services/authService.js';
import type { User } from '@prisma/client';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Auth Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    clearRevokedTokens();
  });

  describe('POST /api/auth/register', () => {
    it('returns HTTP 201 with user profile and token on successful registration', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null); // Username not taken

      const mockCreatedUser: User = {
        id: 'user-uuid-1',
        username: 'alice',
        email: 'alice@example.com',
        avatarUrl: null,
        githubId: null,
        passwordHash: 'salt:hash',
        createdAt: new Date('2026-10-02T12:00:00Z'),
        updatedAt: new Date('2026-10-02T12:00:00Z'),
      };

      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser);

      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        password: 'SecurePassword123!',
        email: 'alice@example.com',
      });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('alice');
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.token.split('.')).toHaveLength(3);
    });

    it('returns HTTP 409 Conflict when username is already registered', async () => {
      const existingUser: User = {
        id: 'user-uuid-existing',
        username: 'alice',
        email: 'alice@existing.com',
        avatarUrl: null,
        githubId: null,
        passwordHash: 'salt:hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(existingUser);

      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        password: 'SecurePassword123!',
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('AUTH_USERNAME_TAKEN');
      expect(response.body.error).toContain('already registered');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 Validation Error when password is less than 8 characters', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns HTTP 200 with safe user and token when credentials match', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = hashPassword(password);

      const mockUser: User = {
        id: 'user-uuid-2',
        username: 'bob',
        email: 'bob@example.com',
        avatarUrl: 'https://avatar.url',
        githubId: null,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const response = await request(app).post('/api/auth/login').send({
        username: 'bob',
        password,
      });

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('bob');
      expect(response.body.token).toBeDefined();
    });

    it('returns HTTP 401 Unauthorized when password is wrong', async () => {
      const passwordHash = hashPassword('CorrectPassword123!');

      const mockUser: User = {
        id: 'user-uuid-2',
        username: 'bob',
        email: 'bob@example.com',
        avatarUrl: null,
        githubId: null,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const response = await request(app).post('/api/auth/login').send({
        username: 'bob',
        password: 'WrongPassword!',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('returns HTTP 401 Unauthorized when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const response = await request(app).post('/api/auth/login').send({
        username: 'nonexistent',
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me and POST /api/auth/logout', () => {
    it('allows access to /api/auth/me with valid Bearer token and blocks after logout', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = hashPassword(password);

      const mockUser: User = {
        id: 'user-uuid-3',
        username: 'charlie',
        email: 'charlie@example.com',
        avatarUrl: null,
        githubId: null,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Log in to get token
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      const loginRes = await request(app).post('/api/auth/login').send({
        username: 'charlie',
        password,
      });

      const token = loginRes.body.token;
      expect(token).toBeDefined();

      // 2. Fetch /api/auth/me with Bearer token
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe('charlie');

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('logged out');

      // 4. Try /api/auth/me again with the same revoked token -> 401
      const meAfterLogoutRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meAfterLogoutRes.status).toBe(401);
      expect(meAfterLogoutRes.body.code).toBe('AUTH_TOKEN_REVOKED');
    });

    it('returns HTTP 401 when Authorization header is missing on protected route', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });
  });
});
