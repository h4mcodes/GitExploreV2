import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { githubClient } from '../../src/github/client.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
  AIConfigurationError,
} from '../../src/ai/types.js';
import { AppError, NotFoundError, RateLimitError } from '../../src/types/api.js';

// Mock GitHub Client
vi.mock('../../src/github/client.js', () => ({
  githubClient: {
    getUser: vi.fn(),
    getRepo: vi.fn(),
    getUserRepos: vi.fn(),
    getBranches: vi.fn(),
    getCommits: vi.fn(),
    getCommit: vi.fn(),
    compareCommits: vi.fn(),
    getRateLimitInfo: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    savedRepository: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    investigation: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    bookmark: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    aIAnalysis: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mock_ai_analysis_1' }),
    },
  },
}));

describe('D9-P6: Failure and Degraded-State Testing', () => {
  const app = createApp();
  let mockAIProvider: MockAIProvider;
  const validToken = generateToken('usr_failure_test_123', 'testuser');

  beforeEach(() => {
    vi.clearAllMocks();
    mockAIProvider = new MockAIProvider();
    setAIProvider(mockAIProvider);
  });

  afterEach(() => {
    resetAIProvider();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GitHub API Unreachable & Failure Scenarios
  // =========================================================================
  describe('1. GitHub API Unreachable & Failure Scenarios', () => {
    it('handles network failure (ECONNREFUSED / connection drop) gracefully with 503', async () => {
      vi.mocked(githubClient.getUser).mockRejectedValueOnce(
        new AppError(
          'GitHub API service is unreachable: fetch failed (ECONNREFUSED)',
          503,
          'GITHUB_SERVICE_UNAVAILABLE'
        )
      );

      const res = await request(app).get('/api/github/users/octocat');

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('GITHUB_SERVICE_UNAVAILABLE');
      expect(res.body.error).toContain('unreachable');
    });

    it('handles upstream GitHub 500/502/503 service outage gracefully', async () => {
      vi.mocked(githubClient.getBranches).mockRejectedValueOnce(
        new AppError(
          'GitHub API request failed with status 503',
          502,
          'GITHUB_API_ERROR',
          { status: 503 }
        )
      );

      const res = await request(app).get('/api/github/repos/facebook/react/branches');

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('GITHUB_API_ERROR');
    });

    it('handles GitHub 404 resource not found cleanly without crashing', async () => {
      vi.mocked(githubClient.getUser).mockRejectedValueOnce(
        new NotFoundError('GitHub resource not found at /users/unknown-ghost-user', 'GITHUB_NOT_FOUND')
      );

      const res = await request(app).get('/api/github/users/unknown-ghost-user');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('GITHUB_NOT_FOUND');
    });

    it('handles GitHub rate limit exhaustion (403/429) with structured error payload', async () => {
      vi.mocked(githubClient.getUser).mockRejectedValueOnce(
        new RateLimitError(
          'GitHub API rate limit exceeded. Resets at 2026-10-09T01:00:00.000Z',
          'GITHUB_RATE_LIMIT_EXCEEDED'
        )
      );

      const res = await request(app).get('/api/github/users/torvalds');

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('GITHUB_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('rate limit');
    });
  });

  // =========================================================================
  // 2. Database Unreachable & Failure Scenarios
  // =========================================================================
  describe('2. Database Unreachable & Failure Scenarios', () => {
    it('handles Prisma connection initialization failure (PrismaClientInitializationError) with 503', async () => {
      const prismaInitError = new Error("Can't reach database server at localhost:5432");
      prismaInitError.name = 'PrismaClientInitializationError';

      vi.mocked(prisma.savedRepository.findMany).mockRejectedValueOnce(prismaInitError);

      const res = await request(app)
        .get('/api/workspace/repositories')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
      expect(res.body.error).toContain('Database connection failed');
    });

    it('handles Prisma P1001 database unreachable error gracefully with 503', async () => {
      const p1001Error = Object.assign(new Error("Can't reach database server"), {
        code: 'P1001',
      });

      vi.mocked(prisma.savedRepository.count).mockRejectedValueOnce(p1001Error);

      const res = await request(app)
        .get('/api/workspace')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('handles Prisma P1002 connection timeout gracefully with 503', async () => {
      const p1002Error = Object.assign(new Error('The database server was reached but timed out'), {
        code: 'P1002',
      });

      vi.mocked(prisma.note.findMany).mockRejectedValueOnce(p1002Error);

      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('handles unexpected database runtime exception with 500 without crashing node process', async () => {
      vi.mocked(prisma.savedRepository.findMany).mockRejectedValueOnce(
        new Error('Database disk I/O failure')
      );

      const res = await request(app)
        .get('/api/workspace/repositories')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // =========================================================================
  // 3. AI Provider Unreachable & Timeout Scenarios
  // =========================================================================
  describe('3. AI Provider Unreachable & Timeout Scenarios', () => {
    it('handles AI provider gateway timeout (504) gracefully', async () => {
      mockAIProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini API request timed out after 30000ms');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux' },
        });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
      expect(res.body.error).toContain('timed out');
    });

    it('handles AI provider rate limit quota exhaustion (429) gracefully', async () => {
      mockAIProvider.setMockResponse(() => {
        throw new AIRateLimitError('Daily Gemini API quota exceeded');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux' },
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('quota exceeded');
    });

    it('handles AI provider service outage (503) gracefully', async () => {
      mockAIProvider.setMockResponse(() => {
        throw new AIProviderError('Google AI service unavailable (high load)', 503);
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux' },
        });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('AI_PROVIDER_ERROR');
    });

    it('handles missing AI credentials (500) gracefully', async () => {
      mockAIProvider.setMockResponse(() => {
        throw new AIConfigurationError('GEMINI_API_KEY environment variable is not configured');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { owner: 'torvalds', repo: 'linux' },
        });

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('AI_CONFIGURATION_ERROR');
    });
  });

  // =========================================================================
  // 4. Concurrency, Malformed Payloads & No Server Crashes
  // =========================================================================
  describe('4. Concurrency, Malformed Payloads & No Server Crashes', () => {
    it('handles malformed JSON body without server crash or hang', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .set('Content-Type', 'application/json')
        .send('{"invalid-json": truncated');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_JSON');
    });

    it('sustains multiple concurrent failing requests without crashing', async () => {
      vi.mocked(githubClient.getUser).mockRejectedValue(
        new AppError('Connection refused', 503, 'GITHUB_SERVICE_UNAVAILABLE')
      );

      const requests = Array.from({ length: 15 }, () =>
        request(app).get('/api/github/users/octocat')
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(15);
      for (const res of responses) {
        expect(res.status).toBe(503);
        expect(res.body.code).toBe('GITHUB_SERVICE_UNAVAILABLE');
      }
    });

    it('maintains system health route 200 OK even when external dependencies are failing', async () => {
      // Simulate external outages
      vi.mocked(githubClient.getUser).mockRejectedValueOnce(
        new AppError('Outage', 503, 'GITHUB_SERVICE_UNAVAILABLE')
      );

      // System health check remains available and healthy
      const healthRes = await request(app).get('/api/health');

      expect(healthRes.status).toBe(200);
      expect(healthRes.body.status).toBe('ok');
      expect(healthRes.body.service).toBe('gitexplore-backend');
    });
  });
});
