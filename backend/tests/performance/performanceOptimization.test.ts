import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  estimatePayloadTokens,
  normalizePatch,
  enforceContextTokenBudget,
  buildAIContext,
  MAX_CONTEXT_TOKEN_BUDGET,
} from '../../src/ai/contextBuilder.js';
import { prisma } from '../../src/config/database.js';

// Mock GitHub Client
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
    getRepo: vi.fn().mockResolvedValue({
      name: 'gitexplore',
      owner: { login: 'h4mcodes' },
      default_branch: 'main',
    }),
    getBranches: vi.fn().mockResolvedValue([{ name: 'main' }]),
    getCommits: vi.fn().mockResolvedValue([]),
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
      count: vi.fn().mockResolvedValue(5),
    },
    investigation: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(2),
    },
    note: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(10),
    },
    bookmark: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(4),
    },
    aIAnalysis: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('D9-P5: Performance Optimization Verification', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Response Timing & Performance Headers
  // =========================================================================
  describe('1. Response Timing & Profiling Headers', () => {
    it('returns X-Response-Time and Server-Timing headers on standard API responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-response-time']).toBeDefined();
      expect(res.headers['x-response-time']).toMatch(/^[0-9.]+ms$/);
      expect(res.headers['server-timing']).toBeDefined();
      expect(res.headers['server-timing']).toMatch(/^total;dur=[0-9.]+$/);
    });

    it('completes health check well within the 2-second performance threshold', async () => {
      const start = Date.now();
      const res = await request(app).get('/api/health');
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(2000); // Strict < 2000ms SLA
    });

    it('returns response time header even on 404 routes', async () => {
      const res = await request(app).get('/api/unknown-endpoint');

      expect(res.status).toBe(404);
      expect(res.headers['x-response-time']).toBeDefined();
    });
  });

  // =========================================================================
  // 2. AI Context Builder Token Optimization
  // =========================================================================
  describe('2. AI Context Builder Token Optimization', () => {
    it('normalizes diff patches by stripping redundant consecutive newlines', () => {
      const rawPatch = '@@ -1,5 +1,5 @@\n\n\n\n- oldCode();\n\n\n\n+ newCode();\n';
      const clean = normalizePatch(rawPatch);

      expect(clean).not.toContain('\n\n\n');
      expect(clean.length).toBeLessThan(rawPatch.length);
      expect(clean).toContain('- oldCode();');
      expect(clean).toContain('+ newCode();');
    });

    it('handles empty or null patch safely in normalizePatch', () => {
      expect(normalizePatch('')).toBe('');
      expect(normalizePatch(null)).toBe('');
      expect(normalizePatch(undefined)).toBe('');
    });

    it('enforces token safety limits when context payload exceeds MAX_CONTEXT_TOKEN_BUDGET', () => {
      // Create huge context with 40 oversized files and large strings
      const hugeFiles = Array.from({ length: 40 }, (_, i) => ({
        filename: `src/components/DeeplyNestedModuleFolder/FileComponent_${i}.tsx`,
        patchSnippet: 'x'.repeat(1500),
        additions: 100,
        deletions: 50,
      }));

      const oversizedPayload = {
        title: 'Massive PR Review',
        files: hugeFiles,
        customEvidence: {
          hugeTrace: 'log_data_'.repeat(1000),
        },
      };

      const initialTokens = estimatePayloadTokens(oversizedPayload);
      expect(initialTokens).toBeGreaterThan(MAX_CONTEXT_TOKEN_BUDGET);

      const pruned = enforceContextTokenBudget(oversizedPayload, MAX_CONTEXT_TOKEN_BUDGET);
      const prunedTokens = estimatePayloadTokens(pruned);

      expect(prunedTokens).toBeLessThanOrEqual(MAX_CONTEXT_TOKEN_BUDGET);
      // All remaining patchSnippets are safely bounded
      const files = pruned.files as Array<{ patchSnippet: string }>;
      for (const f of files) {
        expect(f.patchSnippet.length).toBeLessThanOrEqual(400);
      }
    });

    it('leaves context unchanged if already within token limits', () => {
      const smallPayload = {
        repoName: 'gitexplore',
        stats: { commits: 10 },
      };

      const result = enforceContextTokenBudget(smallPayload, MAX_CONTEXT_TOKEN_BUDGET);
      expect(result).toEqual(smallPayload);
    });

    it('buildAIContext automatically returns pruned context under the token limit', () => {
      const hugeFiles = Array.from({ length: 25 }, (_, i) => ({
        filename: `src/File_${i}.ts`,
        status: 'modified' as const,
        additions: 200,
        deletions: 100,
        changes: 300,
        patch: 'diff_content_'.repeat(500),
      }));

      const context = buildAIContext('DIFF_REVIEW', {
        title: 'Large Diff',
        files: hugeFiles,
      });

      const tokens = estimatePayloadTokens(context);
      expect(tokens).toBeLessThanOrEqual(MAX_CONTEXT_TOKEN_BUDGET);
    });
  });

  // =========================================================================
  // 3. Database Query & Batch Efficiency (Preventing N+1 Queries)
  // =========================================================================
  describe('3. Database Query & Batch Efficiency', () => {
    it('executes user lookup query in UserRepository efficiently with single findUnique', async () => {
      const mockUser = {
        id: 'u-1',
        githubId: 'gh-1',
        username: 'perfuser',
        email: 'perf@test.com',
        avatarUrl: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const { findUserByUsername } = await import('../../src/repositories/userRepository.js');
      const start = Date.now();
      const user = await findUserByUsername('perfuser');
      const duration = Date.now() - start;

      expect(user).toEqual(mockUser);
      expect(duration).toBeLessThan(100);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('executes AI analysis cache lookup by contextHash in single findFirst call', async () => {
      vi.mocked(prisma.aIAnalysis.findFirst).mockResolvedValueOnce(null);

      const { findAIAnalysisByContextHash } = await import(
        '../../src/repositories/aiAnalysisRepository.js'
      );
      const start = Date.now();
      const cached = await findAIAnalysisByContextHash('sha256-perf-test-key');
      const duration = Date.now() - start;

      expect(cached).toBeNull();
      expect(duration).toBeLessThan(100);
      expect(prisma.aIAnalysis.findFirst).toHaveBeenCalledTimes(1);
    });

    it('retrieves saved repositories with eager tags in a single query (no N+1 query loop)', async () => {
      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce([
        {
          id: 'repo-1',
          userId: 'user-123',
          owner: 'h4mcodes',
          name: 'gitexplore',
          fullName: 'h4mcodes/gitexplore',
          description: null,
          language: 'TypeScript',
          stars: 100,
          forks: 10,
          defaultBranch: 'main',
          savedAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { findSavedReposByUserId } = await import(
        '../../src/repositories/savedRepoRepository.js'
      );
      const repos = await findSavedReposByUserId('user-123');

      expect(repos).toHaveLength(1);
      // Confirms single query executed with joined repositoryTags (no N+1 loop)
      expect(prisma.savedRepository.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.savedRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          include: {
            repositoryTags: {
              include: {
                tag: true,
              },
            },
          },
        })
      );
    });
  });
});
