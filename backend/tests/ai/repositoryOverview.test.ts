import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  RepositoryOverviewResponseSchema,
  type RepositoryOverviewResponse,
} from '../../src/ai/schemas/repositoryOverview.js';
import {
  buildRepositoryOverviewPrompt,
  REPOSITORY_OVERVIEW_PROMPT_VERSION,
} from '../../src/ai/prompts/repositoryOverview.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';
import type { GithubApiRepo, GithubApiCommitSummary, GithubApiCommitDetail } from '../../src/github/types.js';

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
      id: `overview-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

describe('AI Repository Overview — Feature Specification (D7-P1)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validOverviewFixture: RepositoryOverviewResponse = {
    summary: 'GitExplore is a developer workbench for Git repository intelligence.',
    purpose: 'Understand commit history, branch divergence, and code architecture with speed and precision.',
    primaryStack: ['TypeScript', 'React', 'Express', 'Prisma'],
    techStack: ['TypeScript', 'React 19', 'Vite 6', 'Express 4', 'Prisma ORM', 'Vitest'],
    activityLevel: 'HIGH',
    maintenanceAssessment: 'Actively maintained with frequent commits, high test coverage, and clear architecture.',
    architectureObservations: [
      'Modular backend with separated intelligence engines and repository abstraction',
      'Glassmorphism responsive frontend with real-time graph visualization',
    ],
    notablePatterns: ['Deterministic DAG modeling', 'Zod schema boundary validation'],
    hotspotAnalysis: {
      criticalFiles: ['backend/src/ai/cache.ts', 'src/index.css'],
      observations: 'Concentrated modifications around caching layer and design tokens',
    },
    growthTrajectory: 'Steady and accelerating development velocity',
    keyTakeaways: [
      'Production-ready TypeScript codebase with comprehensive test suites',
      'Deterministic intelligence foundation cleanly decoupled from AI interpretation',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbStore.clear();

    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validOverviewFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('1. Schema Validation', () => {
    it('validates a complete and compliant repository overview response', () => {
      const parsed = RepositoryOverviewResponseSchema.safeParse(validOverviewFixture);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.activityLevel).toBe('HIGH');
        expect(parsed.data.purpose).toBeDefined();
        expect(parsed.data.primaryStack).toContain('React');
        expect(parsed.data.hotspotAnalysis.criticalFiles).toHaveLength(2);
      }
    });

    it('rejects payload missing summary', () => {
      const invalid = { ...validOverviewFixture, summary: '' };
      const parsed = RepositoryOverviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid activityLevel enum value', () => {
      const invalid = { ...validOverviewFixture, activityLevel: 'SUPER_ACTIVE' };
      const parsed = RepositoryOverviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects empty keyTakeaways list', () => {
      const invalid = { ...validOverviewFixture, keyTakeaways: [] };
      const parsed = RepositoryOverviewResponseSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('supplies defaults for omitted optional arrays', () => {
      const minimal = {
        summary: 'Minimal overview',
        activityLevel: 'LOW' as const,
        hotspotAnalysis: {
          criticalFiles: [],
          observations: 'Low churn throughout',
        },
        growthTrajectory: 'Stable maintenance',
        keyTakeaways: ['Stable code'],
      };

      const parsed = RepositoryOverviewResponseSchema.safeParse(minimal);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.primaryStack).toEqual([]);
        expect(parsed.data.architectureObservations).toEqual([]);
      }
    });
  });

  describe('2. Prompt Construction', () => {
    it('generates versioned prompt embedding structured context and grounding rules', () => {
      const context = {
        repository: { name: 'gitexplore', owner: 'h4mcodes', stars: 250 },
      };

      const promptResult = buildRepositoryOverviewPrompt(context);
      expect(promptResult.version).toBe(REPOSITORY_OVERVIEW_PROMPT_VERSION);
      expect(promptResult.prompt).toContain('"name": "gitexplore"');
      expect(promptResult.systemInstruction).toContain('Never invent facts');
      expect(promptResult.prompt).toContain('Return a valid JSON object adhering strictly to this schema:');
    });
  });

  describe('3. End-to-End Pipeline Execution', () => {
    const mockRepo: GithubApiRepo = {
      id: 99999,
      name: 'gitexplore',
      full_name: 'h4mcodes/gitexplore',
      owner: { login: 'h4mcodes', id: 1, avatar_url: 'https://avatar.url' },
      description: 'Git Intelligence workbench',
      private: false,
      html_url: 'https://github.com/h4mcodes/gitexplore',
      url: 'https://api.github.com/repos/h4mcodes/gitexplore',
      fork: false,
      language: 'TypeScript',
      stargazers_count: 140,
      watchers_count: 140,
      forks_count: 25,
      open_issues_count: 3,
      default_branch: 'main',
      updated_at: '2026-10-03T12:00:00Z',
      pushed_at: '2026-10-03T14:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      homepage: null,
      size: 2048,
    };

    it('generates structured overview when repo input is passed directly', async () => {
      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({
          repo: mockRepo,
          statistics: {
            totalCommits: 120,
            frequency: {
              commitsPerWeek: 15,
              activeDaysCount: 60,
              timeSpanDays: 180,
              firstCommitDate: '2026-01-01',
              lastCommitDate: '2026-10-03',
            },
            changeStats: { totalAdditions: 8000, totalDeletions: 2100, avgChangesPerCommit: 84 },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_OVERVIEW');
      expect(res.body.cached).toBe(false);
      expect(res.body.data.summary).toContain('GitExplore');
      expect(res.body.data.purpose).toContain('Understand commit history');
      expect(res.body.data.primaryStack).toContain('TypeScript');
      expect(res.body.data.activityLevel).toBe('HIGH');
      expect(res.body.data.hotspotAnalysis.criticalFiles).toContain('src/index.css');
      expect(res.body.data.keyTakeaways).toHaveLength(2);
    });

    it('supports dynamic repository resolution by { owner, repo } coordinates', async () => {
      vi.mocked(githubClient.getRepo).mockResolvedValue(mockRepo);

      const mockCommits: GithubApiCommitSummary[] = [
        {
          sha: 'abcdef123',
          commit: {
            author: { name: 'Dev', date: '2026-10-03T10:00:00Z' },
            committer: { name: 'Dev', date: '2026-10-03T10:00:00Z' },
            message: 'feat: add AI overview endpoint',
          },
          parents: [{ sha: 'parent123' }],
          html_url: 'https://github.com/commits/abcdef123',
        },
      ];
      vi.mocked(githubClient.getCommits).mockResolvedValue(mockCommits);

      const mockDetail: GithubApiCommitDetail = {
        ...mockCommits[0]!,
        files: [{ filename: 'src/App.tsx', status: 'modified', additions: 10, deletions: 2, changes: 12 }],
        stats: { total: 12, additions: 10, deletions: 2 },
      };
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockDetail);

      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_OVERVIEW');
      expect(res.body.data.summary).toBeDefined();
      expect(githubClient.getRepo).toHaveBeenCalledWith('h4mcodes', 'gitexplore');
      expect(githubClient.getCommits).toHaveBeenCalled();
    });

    it('caches the repository overview and serves repeated requests with cached: true', async () => {
      const payload = {
        context: {
          repository: {
            name: 'gitexplore-cache-test',
            owner: 'h4mcodes',
          },
        },
      };

      const firstRes = await request(app).post('/api/ai/repository-overview').send(payload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.cached).toBe(false);

      const secondRes = await request(app).post('/api/ai/repository-overview').send(payload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.cached).toBe(true);
      expect(secondRes.body.contextHash).toBe(firstRes.body.contextHash);
      expect(secondRes.body.data.summary).toBe(firstRes.body.data.summary);
    });

    it('forces re-analysis when bypassCache: true is requested', async () => {
      const payload = {
        context: {
          repository: {
            name: 'gitexplore-bypass-test',
            owner: 'h4mcodes',
          },
        },
      };

      await request(app).post('/api/ai/repository-overview').send(payload);

      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({ ...payload, bypassCache: true });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
    });

    it('returns HTTP 400 when neither context, repo, nor coordinates are supplied', async () => {
      const res = await request(app).post('/api/ai/repository-overview').send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_ANALYSIS_CONTEXT');
    });

    it('returns HTTP 429 when AI provider rate limit is encountered', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Gemini 1.5 Flash quota exhausted for this minute');
      });

      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({ context: { sample: 1 } });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('quota exhausted');
    });

    it('returns HTTP 504 when AI provider times out', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini inference request timed out');
      });

      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({ context: { sample: 1 } });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
    });

    it('returns HTTP 502 when AI provider returns unparseable markdown/JSON', async () => {
      mockProvider.setMockResponse(() => 'This is plain text not JSON');

      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({ context: { sample: 1 } });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('AI_INVALID_RESPONSE');
    });
  });
});
