import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  DiffReviewResponseSchema,
  type DiffReviewResponse,
} from '../../src/ai/schemas/diffReview.js';
import {
  buildDiffReviewPrompt,
  DIFF_REVIEW_PROMPT_VERSION,
} from '../../src/ai/prompts/diffReview.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';
import type {
  GithubApiCommitFile,
  GithubApiComparison,
  GithubApiCommitDetail,
} from '../../src/github/types.js';

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
      id: `diff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
    getCommits: vi.fn(),
    getCommit: vi.fn(),
    compareCommits: vi.fn(),
  },
}));

describe('AI Diff Review — Feature Specification (D7-P3)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validDiffReviewFixture: DiffReviewResponse = {
    overallAssessment: 'APPROVED',
    summary: 'High-quality diff adding observations per file with strict Zod validation.',
    netChangesSummary: '+85 / -12 lines across 2 files',
    fileReviews: [
      {
        filename: 'backend/src/ai/schemas/diffReview.ts',
        status: 'modified',
        feedback: 'Clean Zod schema extension with observation severity and category.',
        issuesFound: ['Ensure enum values match across frontend and backend'],
        observations: [
          {
            message: 'Ensure enum values match across frontend and backend',
            severity: 'INFO',
            category: 'MAINTAINABILITY',
            lineNumber: 15,
            suggestion: 'Export shared type or synchronize documentation',
          },
        ],
      },
      {
        filename: 'backend/src/controllers/aiController.ts',
        status: 'modified',
        feedback: 'Dynamic comparison resolution is robustly handled.',
        issuesFound: [],
        observations: [
          {
            message: 'No security risks or unhandled promise rejections identified',
            severity: 'INFO',
            category: 'SECURITY',
          },
        ],
      },
    ],
    riskFactors: ['Minor schema migration consideration for legacy cached reviews'],
    recommendations: ['Run full test suite across AI endpoints'],
    keyObservations: [
      {
        message: 'Diff conforms cleanly to repository engineering standards',
        severity: 'INFO',
        category: 'CODE_QUALITY',
      },
    ],
  };

  const mockFiles: GithubApiCommitFile[] = [
    {
      filename: 'backend/src/ai/schemas/diffReview.ts',
      status: 'modified',
      additions: 45,
      deletions: 5,
      changes: 50,
      patch: '@@ -1,10 +1,25 @@\n+export const DiffObservationSeveritySchema = z.enum(...)',
    },
    {
      filename: 'backend/src/controllers/aiController.ts',
      status: 'modified',
      additions: 40,
      deletions: 7,
      changes: 47,
      patch: '@@ -360,5 +360,35 @@\n+export async function postDiffReview()',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    dbStore.clear();

    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validDiffReviewFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('1. Schema Validation', () => {
    it('validates a complete and compliant diff review response with observations per file', () => {
      const parsed = DiffReviewResponseSchema.safeParse(validDiffReviewFixture);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overallAssessment).toBe('APPROVED');
        expect(parsed.data.summary).toContain('High-quality diff');
        expect(parsed.data.fileReviews).toHaveLength(2);

        const firstFile = parsed.data.fileReviews[0]!;
        expect(firstFile.filename).toBe('backend/src/ai/schemas/diffReview.ts');
        expect(firstFile.observations).toHaveLength(1);
        expect(firstFile.observations[0]!.severity).toBe('INFO');
        expect(firstFile.observations[0]!.category).toBe('MAINTAINABILITY');
        expect(firstFile.observations[0]!.suggestion).toBeDefined();

        expect(parsed.data.riskFactors).toHaveLength(1);
        expect(parsed.data.recommendations).toHaveLength(1);
        expect(parsed.data.keyObservations).toHaveLength(1);
      }
    });

    it('synthesizes observations from legacy issuesFound string array', () => {
      const legacyPayload = {
        overallAssessment: 'CHANGES_REQUESTED',
        summary: 'Identified potential memory leak',
        netChangesSummary: '+10 / -5',
        fileReviews: [
          {
            filename: 'backend/src/ai/cache.ts',
            status: 'modified',
            feedback: 'Unbounded cache growth detected',
            issuesFound: ['Cache map never evicts expired keys on write'],
          },
        ],
        riskFactors: ['Memory exhaustion under heavy traffic'],
        recommendations: ['Add periodic eviction interval'],
      };

      const parsed = DiffReviewResponseSchema.safeParse(legacyPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overallAssessment).toBe('CHANGES_REQUESTED');
        expect(parsed.data.fileReviews[0]!.observations).toHaveLength(1);
        expect(parsed.data.fileReviews[0]!.observations[0]!.message).toBe(
          'Cache map never evicts expired keys on write'
        );
        expect(parsed.data.fileReviews[0]!.observations[0]!.severity).toBe('WARNING');
        expect(parsed.data.fileReviews[0]!.observations[0]!.category).toBe('CODE_QUALITY');
      }
    });

    it('rejects payload missing summary', () => {
      const invalid = { ...validDiffReviewFixture, summary: '' };
      const parsed = DiffReviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid overallAssessment enum value', () => {
      const invalid = { ...validDiffReviewFixture, overallAssessment: 'SUPER_LGTM' };
      const parsed = DiffReviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid observation severity value', () => {
      const invalid = {
        ...validDiffReviewFixture,
        fileReviews: [
          {
            filename: 'foo.ts',
            status: 'modified',
            feedback: 'bad severity',
            issuesFound: [],
            observations: [
              {
                message: 'Bad severity test',
                severity: 'DISASTER',
                category: 'BUG',
              },
            ],
          },
        ],
      };
      const parsed = DiffReviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid observation category value', () => {
      const invalid = {
        ...validDiffReviewFixture,
        fileReviews: [
          {
            filename: 'foo.ts',
            status: 'modified',
            feedback: 'bad category',
            issuesFound: [],
            observations: [
              {
                message: 'Bad category test',
                severity: 'INFO',
                category: 'COSMETIC_GLITCH',
              },
            ],
          },
        ],
      };
      const parsed = DiffReviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('2. Prompt Construction', () => {
    it('generates versioned prompt embedding review evidence and schema instructions', () => {
      const context = {
        reviewTarget: {
          title: 'PR #42: Add Diff Review',
          baseRef: 'main',
          headRef: 'feat/diff-review',
        },
        files: [{ filename: 'src/index.ts', additions: 10, deletions: 2 }],
      };

      const promptResult = buildDiffReviewPrompt(context);
      expect(promptResult.version).toBe(DIFF_REVIEW_PROMPT_VERSION);
      expect(promptResult.prompt).toContain('"title": "PR #42: Add Diff Review"');
      expect(promptResult.systemInstruction).toContain('objective, rigorous code diff reviewer');
      expect(promptResult.prompt).toContain('Return a valid JSON object adhering strictly to this schema:');
      expect(promptResult.prompt).toContain('"observations"');
      expect(promptResult.prompt).toContain('"severity"');
      expect(promptResult.prompt).toContain('"category"');
    });
  });

  describe('3. End-to-End Pipeline Execution', () => {
    it('generates structured diff review when files are provided directly', async () => {
      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({
          title: 'PR: Implement Diff Review',
          files: mockFiles,
          baseRef: 'main',
          headRef: 'feature/diff-review',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('DIFF_REVIEW');
      expect(res.body.cached).toBe(false);
      expect(res.body.data.overallAssessment).toBe('APPROVED');
      expect(res.body.data.summary).toContain('High-quality diff');
      expect(res.body.data.fileReviews).toHaveLength(2);

      const fileReview = res.body.data.fileReviews[0];
      expect(fileReview.observations).toHaveLength(1);
      expect(fileReview.observations[0].severity).toBe('INFO');
      expect(fileReview.observations[0].category).toBe('MAINTAINABILITY');
    });

    it('supports dynamic comparison resolution by { owner, repo, base, head } coordinates', async () => {
      const mockComparison: GithubApiComparison = {
        url: 'https://api.github.com/repos/h4mcodes/gitexplore/compare/main...feat',
        html_url: 'https://github.com/h4mcodes/gitexplore/compare/main...feat',
        permalink_url: 'https://github.com/h4mcodes/gitexplore/compare/main...feat',
        diff_url: 'https://github.com/h4mcodes/gitexplore/compare/main...feat.diff',
        patch_url: 'https://github.com/h4mcodes/gitexplore/compare/main...feat.patch',
        base_commit: {
          sha: 'base123',
          commit: {
            author: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
            committer: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
            message: 'base commit',
          },
          parents: [],
          html_url: 'https://github.com/commits/base123',
        },
        merge_base_commit: {
          sha: 'base123',
          commit: {
            author: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
            committer: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
            message: 'base commit',
          },
          parents: [],
          html_url: 'https://github.com/commits/base123',
        },
        status: 'ahead',
        ahead_by: 2,
        behind_by: 0,
        total_commits: 2,
        commits: [],
        files: mockFiles,
      };

      vi.mocked(githubClient.compareCommits).mockResolvedValue(mockComparison);

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
          base: 'main',
          head: 'feature/diff-review',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('DIFF_REVIEW');
      expect(res.body.data.overallAssessment).toBeDefined();
      expect(githubClient.compareCommits).toHaveBeenCalledWith(
        'h4mcodes',
        'gitexplore',
        'main',
        'feature/diff-review'
      );
    });

    it('supports dynamic commit diff resolution by { owner, repo, sha } coordinates', async () => {
      const mockCommitDetail: GithubApiCommitDetail = {
        sha: 'commit999',
        commit: {
          author: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
          committer: { name: 'Dev', date: '2026-10-04T00:00:00Z' },
          message: 'feat: add diff reviewer',
        },
        author: { login: 'dev', id: 1, avatar_url: 'https://avatar.url' },
        parents: [{ sha: 'parent888' }],
        html_url: 'https://github.com/commits/commit999',
        stats: { total: 97, additions: 85, deletions: 12 },
        files: mockFiles,
      };

      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
          sha: 'commit999',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('DIFF_REVIEW');
      expect(res.body.data.summary).toBeDefined();
      expect(githubClient.getCommit).toHaveBeenCalledWith('h4mcodes', 'gitexplore', 'commit999');
    });

    it('caches the diff review and serves repeated requests with cached: true', async () => {
      const payload = {
        context: {
          reviewTarget: { title: 'Cache Test' },
          files: [{ filename: 'src/App.tsx', additions: 5 }],
        },
      };

      const firstRes = await request(app).post('/api/ai/diff-review').send(payload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.cached).toBe(false);

      const secondRes = await request(app).post('/api/ai/diff-review').send(payload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.cached).toBe(true);
      expect(secondRes.body.contextHash).toBe(firstRes.body.contextHash);
      expect(secondRes.body.data.summary).toBe(firstRes.body.data.summary);
    });

    it('forces re-analysis when bypassCache: true is requested', async () => {
      const payload = {
        context: {
          reviewTarget: { title: 'Bypass Test' },
          files: [{ filename: 'src/App.tsx', additions: 15 }],
        },
      };

      await request(app).post('/api/ai/diff-review').send(payload);

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({ ...payload, bypassCache: true });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
    });

    it('returns HTTP 400 when neither context, files, nor coordinates are supplied', async () => {
      const res = await request(app).post('/api/ai/diff-review').send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_ANALYSIS_CONTEXT');
    });

    it('returns HTTP 429 when AI provider rate limit is encountered', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Gemini quota exhausted for diff analysis');
      });

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({ context: { sample: 'diff-data' } });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('quota exhausted');
    });

    it('returns HTTP 504 when AI provider times out', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini inference request timed out');
      });

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({ context: { sample: 'diff-data' } });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
    });

    it('returns HTTP 502 when AI provider returns unparseable text', async () => {
      mockProvider.setMockResponse(() => 'Plain non-JSON text diff review');

      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({ context: { sample: 'diff-data' } });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('AI_INVALID_RESPONSE');
    });

    it('POST /api/ai/analyze successfully handles DIFF_REVIEW analysis type', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'DIFF_REVIEW',
          context: {
            reviewTarget: { title: 'Universal Endpoint Diff Test' },
            files: [{ filename: 'backend/src/ai/cache.ts' }],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('DIFF_REVIEW');
      expect(res.body.data.overallAssessment).toBe('APPROVED');
      expect(res.body.data.summary).toContain('High-quality diff');
    });
  });
});
