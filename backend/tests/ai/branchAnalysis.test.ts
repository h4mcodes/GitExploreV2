import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  BranchAnalysisResponseSchema,
  type BranchAnalysisResponse,
} from '../../src/ai/schemas/branchAnalysis.js';
import {
  buildBranchAnalysisPrompt,
  BRANCH_ANALYSIS_PROMPT_VERSION,
} from '../../src/ai/prompts/branchAnalysis.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';
import type { BranchDivergenceAnalysis } from '../../src/intelligence/types.js';
import type { GithubApiComparison } from '../../src/github/types.js';

// In-memory mock store for AI Analysis DB repository
const dbStore = new Map<string, AIAnalysis>();

vi.mock('../../src/repositories/aiAnalysisRepository.js', () => ({
  createAIAnalysis: vi.fn(async (input: {
    repositoryId?: string | null;
    analysisType: string;
    contextHash: string;
    prompt: string;
    response: Record<string, unknown>;
    provider: string;
    modelId: string;
    tokenUsage: Record<string, unknown>;
    expiresAt: Date;
  }) => {
    const item: AIAnalysis = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      repositoryId: input.repositoryId || null,
      analysisType: input.analysisType as any,
      contextHash: input.contextHash,
      prompt: input.prompt,
      response: input.response as any,
      provider: input.provider,
      modelId: input.modelId,
      tokenUsage: input.tokenUsage as any,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
    };
    dbStore.set(input.contextHash, item);
    return item;
  }),
  findAIAnalysisByContextHash: vi.fn(async (contextHash: string, now: Date = new Date()) => {
    const item = dbStore.get(contextHash);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= now) return null;
    return item;
  }),
}));

// Mock githubClient
vi.mock('../../src/github/client.js', () => ({
  githubClient: {
    getRepo: vi.fn(),
    compareCommits: vi.fn(),
  },
}));

describe('AI Branch Analysis — Feature Specification (D7-P4)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validBranchAnalysisFixture: BranchAnalysisResponse = {
    divergenceSummary: 'Feature branch feature/auth is 3 commits ahead and 1 commit behind main.',
    syncStatus: 'DIVERGED',
    mergeReadiness: 'NEEDS_REBASE',
    mergeRisk: 'LOW',
    keyContributions: [
      'Add biometric authentication flow',
      'Update token exchange middleware',
      'Fix session revocation race condition',
    ],
    notableChanges: [
      'src/auth/biometrics.ts added',
      'src/middleware/session.ts modified',
    ],
    mainAuthors: ['alice', 'bob'],
    riskFactors: [
      'Base branch main has moved forward with 1 commit touch session middleware',
    ],
    recommendations: [
      'Rebase feature/auth on main before opening pull request',
      'Verify integration tests with latest session schema',
    ],
  };

  const sampleDivergence: BranchDivergenceAnalysis = {
    baseRef: 'main',
    headRef: 'feature/auth',
    status: 'diverged',
    aheadBy: 3,
    behindBy: 1,
    mergeBaseSha: 'base1234567890abcdef',
    mergeBaseMessage: 'chore: bump dependencies',
    delta: {
      totalCommits: 3,
      totalFilesChanged: 4,
      totalAdditions: 120,
      totalDeletions: 15,
      authors: [
        { name: 'Alice Smith', login: 'alice', commitCount: 2 },
        { name: 'Bob Jones', login: 'bob', commitCount: 1 },
      ],
      commitMessages: [
        'feat(auth): add biometric authentication',
        'refactor: streamline session token logic',
        'fix: handle expired tokens gracefully',
      ],
    },
  };

  const sampleComparison: GithubApiComparison = {
    url: 'https://api.github.com/repos/octocat/repo/compare/main...feature/auth',
    html_url: 'https://github.com/octocat/repo/compare/main...feature/auth',
    status: 'diverged',
    ahead_by: 3,
    behind_by: 1,
    total_commits: 3,
    commits: [
      {
        sha: 'c111111111111111111111111111111111111111',
        commit: {
          author: { name: 'Alice Smith', email: 'alice@example.com', date: '2026-10-01T10:00:00Z' },
          committer: { name: 'Alice Smith', email: 'alice@example.com', date: '2026-10-01T10:00:00Z' },
          message: 'feat(auth): add biometric authentication',
        },
        author: { login: 'alice', id: 1, avatar_url: '', html_url: '' },
      } as any,
    ],
    files: [
      {
        sha: 'f111',
        filename: 'src/auth/biometrics.ts',
        status: 'added',
        additions: 100,
        deletions: 0,
        changes: 100,
      },
    ],
    merge_base_commit: {
      sha: 'base1234567890abcdef',
      commit: { message: 'chore: bump dependencies' },
    } as any,
  };

  beforeEach(() => {
    dbStore.clear();
    vi.clearAllMocks();
    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validBranchAnalysisFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('Prompt Construction & Versioning', () => {
    it('constructs prompt containing divergence metrics, authors, and schema directives', () => {
      const result = buildBranchAnalysisPrompt({
        branchComparison: {
          baseRef: 'main',
          headRef: 'feature/auth',
          aheadBy: 3,
          behindBy: 1,
        },
      });

      expect(result.version).toBe(BRANCH_ANALYSIS_PROMPT_VERSION);
      expect(result.prompt).toContain('feature/auth');
      expect(result.prompt).toContain('divergenceSummary');
      expect(result.prompt).toContain('mergeReadiness');
      expect(result.prompt).toContain('mergeRisk');
      expect(result.systemInstruction).toContain('GitExplore AI');
    });
  });

  describe('Schema Validation (BranchAnalysisResponseSchema)', () => {
    it('validates a complete, compliant branch analysis response', () => {
      const parsed = BranchAnalysisResponseSchema.parse(validBranchAnalysisFixture);
      expect(parsed.divergenceSummary).toBe(validBranchAnalysisFixture.divergenceSummary);
      expect(parsed.syncStatus).toBe('DIVERGED');
      expect(parsed.mergeReadiness).toBe('NEEDS_REBASE');
      expect(parsed.mergeRisk).toBe('LOW');
      expect(parsed.keyContributions).toHaveLength(3);
      expect(parsed.mainAuthors).toEqual(['alice', 'bob']);
    });

    it('handles alias summary field and populates default arrays', () => {
      const parsed = BranchAnalysisResponseSchema.parse({
        summary: 'Branch is cleanly synced with upstream main.',
        syncStatus: 'SYNCED',
        mergeReadiness: 'READY',
      });

      expect(parsed.divergenceSummary).toBe('Branch is cleanly synced with upstream main.');
      expect(parsed.mergeRisk).toBe('LOW');
      expect(parsed.keyContributions).toEqual([]);
      expect(parsed.riskFactors).toEqual([]);
      expect(parsed.recommendations).toEqual([]);
    });

    it('rejects invalid syncStatus or missing summary', () => {
      expect(() => {
        BranchAnalysisResponseSchema.parse({
          syncStatus: 'UNKNOWN_STATUS',
          mergeReadiness: 'READY',
        });
      }).toThrow();

      expect(() => {
        BranchAnalysisResponseSchema.parse({
          divergenceSummary: '',
          syncStatus: 'SYNCED',
          mergeReadiness: 'READY',
        });
      }).toThrow();
    });
  });

  describe('POST /api/ai/branch-analysis Endpoint', () => {
    it('analyzes prebuilt context successfully', async () => {
      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          context: {
            branchComparison: {
              baseRef: 'main',
              headRef: 'feature/auth',
              aheadBy: 3,
              behindBy: 1,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('BRANCH_ANALYSIS');
      expect(response.body.cached).toBe(false);
      expect(response.body.data.divergenceSummary).toContain('Feature branch feature/auth');
      expect(response.body.data.syncStatus).toBe('DIVERGED');
      expect(response.body.data.mergeReadiness).toBe('NEEDS_REBASE');
    });

    it('analyzes structured divergence and comparison objects', async () => {
      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          divergence: sampleDivergence,
          comparison: sampleComparison,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('BRANCH_ANALYSIS');
      expect(response.body.data.mergeRisk).toBe('LOW');
      expect(response.body.data.mainAuthors).toEqual(['alice', 'bob']);
    });

    it('dynamically fetches GitHub comparison when given owner, repo, base, and head', async () => {
      vi.mocked(githubClient.compareCommits).mockResolvedValueOnce(sampleComparison);

      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          owner: 'octocat',
          repo: 'hello-world',
          base: 'main',
          head: 'feature/auth',
        });

      expect(response.status).toBe(200);
      expect(githubClient.compareCommits).toHaveBeenCalledWith(
        'octocat',
        'hello-world',
        'main',
        'feature/auth'
      );
      expect(response.body.data.divergenceSummary).toBeDefined();
    });

    it('works with the alias route POST /api/ai/branch-comparison', async () => {
      const response = await request(app)
        .post('/api/ai/branch-comparison')
        .send({
          divergence: sampleDivergence,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('BRANCH_ANALYSIS');
      expect(response.body.data.syncStatus).toBe('DIVERGED');
    });

    it('returns cached response on second identical request', async () => {
      const payload = {
        divergence: sampleDivergence,
      };

      const res1 = await request(app).post('/api/ai/branch-analysis').send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.cached).toBe(false);

      const res2 = await request(app).post('/api/ai/branch-analysis').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.cached).toBe(true);
      expect(res2.body.contextHash).toBe(res1.body.contextHash);
      expect(res2.body.data).toEqual(res1.body.data);
    });

    it('bypasses cache when bypassCache is true', async () => {
      const payload = {
        divergence: sampleDivergence,
      };

      await request(app).post('/api/ai/branch-analysis').send(payload);

      const resBypass = await request(app)
        .post('/api/ai/branch-analysis')
        .send({ ...payload, bypassCache: true });

      expect(resBypass.status).toBe(200);
      expect(resBypass.body.cached).toBe(false);
    });

    it('rejects request with HTTP 400 when missing all input variants', async () => {
      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_BRANCH_ANALYSIS_INPUT');
    });

    it('handles provider rate limits gracefully with HTTP 429', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Rate limit exhausted');
      });

      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          divergence: sampleDivergence,
        });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
    });

    it('handles provider timeouts gracefully with HTTP 504', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini request timed out');
      });

      const response = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          divergence: sampleDivergence,
        });

      expect(response.status).toBe(504);
      expect(response.body.code).toBe('AI_TIMEOUT');
    });
  });
});
