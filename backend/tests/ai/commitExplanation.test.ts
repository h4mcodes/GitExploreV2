import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  CommitExplanationResponseSchema,
  type CommitExplanationResponse,
} from '../../src/ai/schemas/commitExplanation.js';
import {
  buildCommitExplanationPrompt,
  COMMIT_EXPLANATION_PROMPT_VERSION,
} from '../../src/ai/prompts/commitExplanation.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';
import type { GithubApiCommitDetail } from '../../src/github/types.js';

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
      id: `commit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
  },
}));

describe('AI Commit Explainer — Feature Specification (D7-P2)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validExplanationFixture: CommitExplanationResponse = {
    intent: 'FEATURE',
    summary: 'Add real-time commit explainer AI pipeline with Zod validation',
    motivation: 'Users require intelligent forensic explanations of commit diffs and rationale directly in the workbench.',
    technicalImpact: 'Introduces commit explanation prompt and schema with zero latency regressions.',
    complexity: 'MEDIUM',
    changesPerFile: [
      {
        filename: 'backend/src/ai/prompts/commitExplanation.ts',
        summary: 'Added schema guidance and forensic instructions',
        riskLevel: 'LOW',
      },
      {
        filename: 'backend/src/ai/schemas/commitExplanation.ts',
        summary: 'Added Zod schema validation with transform fallback',
        riskLevel: 'LOW',
      },
    ],
    modifiedComponents: [
      {
        filename: 'backend/src/ai/prompts/commitExplanation.ts',
        summary: 'Added schema guidance and forensic instructions',
        riskLevel: 'LOW',
      },
      {
        filename: 'backend/src/ai/schemas/commitExplanation.ts',
        summary: 'Added Zod schema validation with transform fallback',
        riskLevel: 'LOW',
      },
    ],
    potentialRisks: ['Slight token consumption increase on very large diffs'],
    isBreakingChange: false,
    keyChanges: [
      'Engineered structured JSON prompt instructions',
      'Harmonized changesPerFile and modifiedComponents',
    ],
  };

  const mockCommitDetail: GithubApiCommitDetail = {
    sha: '8f7a932b1c4e6d5a7b8c9d0e1f2a3b4c5d6e7f8a',
    commit: {
      author: {
        name: 'H4MZA',
        email: 'hamza@example.com',
        date: '2026-10-04T12:00:00Z',
      },
      committer: {
        name: 'H4MZA',
        email: 'hamza@example.com',
        date: '2026-10-04T12:00:00Z',
      },
      message: 'feat: implement AI commit explainer pipeline',
    },
    author: {
      login: 'h4mcodes',
      id: 1,
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
    parents: [{ sha: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' }],
    html_url: 'https://github.com/h4mcodes/gitexplore/commit/8f7a932b1c4e6d5a7b8c9d0e1f2a3b4c5d6e7f8a',
    stats: { total: 45, additions: 40, deletions: 5 },
    files: [
      {
        filename: 'backend/src/ai/prompts/commitExplanation.ts',
        status: 'modified',
        additions: 25,
        deletions: 2,
        changes: 27,
        patch: '@@ -10,3 +10,15 @@\n+export function buildCommitExplanationPrompt()',
      },
      {
        filename: 'backend/src/ai/schemas/commitExplanation.ts',
        status: 'modified',
        additions: 15,
        deletions: 3,
        changes: 18,
        patch: '@@ -5,2 +5,10 @@\n+export const CommitExplanationResponseSchema',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbStore.clear();

    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validExplanationFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('1. Schema Validation', () => {
    it('validates a complete and compliant commit explanation response', () => {
      const parsed = CommitExplanationResponseSchema.safeParse(validExplanationFixture);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.intent).toBe('FEATURE');
        expect(parsed.data.summary).toContain('commit explainer');
        expect(parsed.data.motivation).toBeDefined();
        expect(parsed.data.complexity).toBe('MEDIUM');
        expect(parsed.data.changesPerFile).toHaveLength(2);
        expect(parsed.data.modifiedComponents).toHaveLength(2);
        expect(parsed.data.potentialRisks).toHaveLength(1);
        expect(parsed.data.isBreakingChange).toBe(false);
      }
    });

    it('populates motivation, complexity, and changesPerFile from legacy payload', () => {
      const legacyPayload = {
        intent: 'BUGFIX',
        summary: 'Fixed null check in commit parser',
        technicalImpact: 'Prevents crash when commit author is null',
        modifiedComponents: [
          {
            filename: 'backend/src/ai/contextBuilder.ts',
            summary: 'Added fallback for null author',
            riskLevel: 'LOW',
          },
        ],
        potentialRisks: [],
        isBreakingChange: false,
      };

      const parsed = CommitExplanationResponseSchema.safeParse(legacyPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.motivation).toBe(legacyPayload.summary);
        expect(parsed.data.complexity).toBe('LOW');
        expect(parsed.data.changesPerFile).toHaveLength(1);
        expect(parsed.data.changesPerFile[0]?.filename).toBe('backend/src/ai/contextBuilder.ts');
        expect(parsed.data.modifiedComponents).toHaveLength(1);
      }
    });

    it('rejects payload missing summary', () => {
      const invalid = { ...validExplanationFixture, summary: '' };
      const parsed = CommitExplanationResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects payload missing technicalImpact', () => {
      const invalid = { ...validExplanationFixture, technicalImpact: '' };
      const parsed = CommitExplanationResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid intent enum value', () => {
      const invalid = { ...validExplanationFixture, intent: 'INVALID_INTENT' };
      const parsed = CommitExplanationResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid complexity enum value', () => {
      const invalid = { ...validExplanationFixture, complexity: 'SUPER_HIGH' };
      const parsed = CommitExplanationResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('2. Prompt Construction', () => {
    it('generates versioned prompt embedding structured commit context and schema requirements', () => {
      const context = {
        commit: {
          sha: '8f7a932b1c4e6d5a',
          message: 'feat: add commit explainer',
        },
      };

      const promptResult = buildCommitExplanationPrompt(context);
      expect(promptResult.version).toBe(COMMIT_EXPLANATION_PROMPT_VERSION);
      expect(promptResult.prompt).toContain('"sha": "8f7a932b1c4e6d5a"');
      expect(promptResult.systemInstruction).toContain('expert code reviewer and Git forensics assistant');
      expect(promptResult.prompt).toContain('Return a valid JSON object adhering strictly to this schema:');
      expect(promptResult.prompt).toContain('"motivation"');
      expect(promptResult.prompt).toContain('"complexity"');
      expect(promptResult.prompt).toContain('"changesPerFile"');
    });
  });

  describe('3. End-to-End Pipeline Execution', () => {
    it('generates structured explanation when commit input is passed directly', async () => {
      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          commit: mockCommitDetail,
          repositoryCoordinates: { owner: 'h4mcodes', repo: 'gitexplore' },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('COMMIT_EXPLANATION');
      expect(res.body.cached).toBe(false);
      expect(res.body.data.summary).toContain('commit explainer');
      expect(res.body.data.motivation).toBeDefined();
      expect(res.body.data.technicalImpact).toBeDefined();
      expect(res.body.data.complexity).toBe('MEDIUM');
      expect(res.body.data.changesPerFile).toHaveLength(2);
      expect(res.body.data.potentialRisks).toHaveLength(1);
    });

    it('supports dynamic commit resolution by { owner, repo, sha } coordinates', async () => {
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
          sha: '8f7a932b1c4e6d5a7b8c9d0e1f2a3b4c5d6e7f8a',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('COMMIT_EXPLANATION');
      expect(res.body.data.summary).toBeDefined();
      expect(githubClient.getCommit).toHaveBeenCalledWith(
        'h4mcodes',
        'gitexplore',
        '8f7a932b1c4e6d5a7b8c9d0e1f2a3b4c5d6e7f8a'
      );
    });

    it('supports dynamic commit resolution with ref alias', async () => {
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
          ref: 'main',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('COMMIT_EXPLANATION');
      expect(githubClient.getCommit).toHaveBeenCalledWith('h4mcodes', 'gitexplore', 'main');
    });

    it('caches the commit explanation and serves repeated requests with cached: true', async () => {
      const payload = {
        context: {
          commit: {
            sha: 'cache-test-sha',
            message: 'test cache',
          },
        },
      };

      const firstRes = await request(app).post('/api/ai/commit-explanation').send(payload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.cached).toBe(false);

      const secondRes = await request(app).post('/api/ai/commit-explanation').send(payload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.cached).toBe(true);
      expect(secondRes.body.contextHash).toBe(firstRes.body.contextHash);
      expect(secondRes.body.data.summary).toBe(firstRes.body.data.summary);
    });

    it('forces re-analysis when bypassCache: true is requested', async () => {
      const payload = {
        context: {
          commit: {
            sha: 'bypass-test-sha',
            message: 'test bypass',
          },
        },
      };

      await request(app).post('/api/ai/commit-explanation').send(payload);

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({ ...payload, bypassCache: true });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
    });

    it('returns HTTP 400 when neither context, commit, nor coordinates are supplied', async () => {
      const res = await request(app).post('/api/ai/commit-explanation').send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_ANALYSIS_CONTEXT');
    });

    it('returns HTTP 429 when AI provider rate limit is encountered', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Gemini quota exhausted for commit analysis');
      });

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({ context: { sample: 'commit-data' } });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('quota exhausted');
    });

    it('returns HTTP 504 when AI provider times out', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini inference request timed out');
      });

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({ context: { sample: 'commit-data' } });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
    });

    it('returns HTTP 502 when AI provider returns unparseable markdown/JSON', async () => {
      mockProvider.setMockResponse(() => 'Plain non-JSON text explanation');

      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({ context: { sample: 'commit-data' } });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('AI_INVALID_RESPONSE');
    });

    it('POST /api/ai/analyze successfully handles COMMIT_EXPLANATION analysis type', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'COMMIT_EXPLANATION',
          context: {
            commit: {
              sha: 'universal-endpoint-sha',
              message: 'feat: universal endpoint test',
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('COMMIT_EXPLANATION');
      expect(res.body.data.summary).toContain('commit explainer');
    });
  });
});
