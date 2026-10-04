import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  RepositoryHealthResponseSchema,
  type RepositoryHealthResponse,
} from '../../src/ai/schemas/repositoryHealth.js';
import {
  buildRepositoryHealthPrompt,
  REPOSITORY_HEALTH_PROMPT_VERSION,
} from '../../src/ai/prompts/repositoryHealth.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';
import type { GithubApiRepo, GithubApiCommitDetail } from '../../src/github/types.js';
import type { CommitStatistics, RepositoryEvolutionAnalysis } from '../../src/intelligence/types.js';

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
      id: `health-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

describe('AI Repository Health — Feature Specification (D7-P5)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validHealthFixture: RepositoryHealthResponse = {
    healthGrade: 'A',
    healthScore: 94,
    vitalityStatus: 'THRIVING',
    summary: 'The repository exhibits strong commit cadence, active maintenance, and healthy release velocity.',
    trajectoryAssessment: 'Accelerating growth with a 1.4x momentum multiplier over the past quarter.',
    activityAssessment: 'High frequency of active days and consistent weekly contributions.',
    maintenanceSignals: [
      'Frequent commits across diverse contributors',
      'Recent release activity within the last 7 days',
    ],
    maintenanceRisks: [
      'High churn concentrated in core configuration modules',
    ],
    risks: [
      'High churn concentrated in core configuration modules',
    ],
    codeChurnHotspots: ['src/config/env.ts', 'src/app.ts'],
    actionableRecommendations: [
      'Refactor monolithic configuration into modular schemas',
      'Expand automated regression testing coverage for hotspots',
    ],
    recommendations: [
      'Refactor monolithic configuration into modular schemas',
      'Expand automated regression testing coverage for hotspots',
    ],
  };

  const sampleRepo: GithubApiRepo = {
    id: 12345,
    node_id: 'R_123',
    name: 'gitexplore',
    full_name: 'h4mcodes/gitexplore',
    private: false,
    owner: {
      login: 'h4mcodes',
      id: 1,
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      html_url: 'https://github.com/h4mcodes',
    },
    html_url: 'https://github.com/h4mcodes/gitexplore',
    description: 'Git repository intelligence platform',
    fork: false,
    url: 'https://api.github.com/repos/h4mcodes/gitexplore',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-04T12:00:00Z',
    pushed_at: '2026-10-04T12:00:00Z',
    stargazers_count: 150,
    watchers_count: 150,
    language: 'TypeScript',
    forks_count: 20,
    open_issues_count: 5,
    default_branch: 'main',
  };

  const sampleStatistics: CommitStatistics = {
    totalCommits: 45,
    changeStats: {
      totalAdditions: 4000,
      totalDeletions: 500,
      netChanges: 3500,
      averageAdditionsPerCommit: 88,
      averageDeletionsPerCommit: 11,
    },
    frequency: {
      commitsPerWeek: 12,
      activeDaysCount: 15,
      timeSpanDays: 30,
      firstCommitDate: '2026-09-01T00:00:00Z',
      lastCommitDate: '2026-10-04T00:00:00Z',
    },
    activeTimeline: [],
  };

  const sampleEvolution: RepositoryEvolutionAnalysis = {
    trajectory: {
      pattern: 'ACCELERATING',
      description: 'Commit volume and contributor activity are steadily increasing.',
      momentumMultiplier: 1.4,
      recentVelocity: 25,
      previousVelocity: 18,
    },
    periods: [
      {
        intensity: 'HIGH',
        commitCount: 25,
        startDate: '2026-09-15T00:00:00Z',
        endDate: '2026-10-04T00:00:00Z',
      },
    ],
    timeline: [],
  };

  beforeEach(() => {
    dbStore.clear();
    vi.clearAllMocks();
    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validHealthFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('Prompt Construction & Versioning', () => {
    it('constructs prompt containing vitality instructions and schema contract', () => {
      const result = buildRepositoryHealthPrompt({
        repository: {
          name: 'gitexplore',
          starsCount: 150,
        },
      });

      expect(result.version).toBe(REPOSITORY_HEALTH_PROMPT_VERSION);
      expect(result.prompt).toContain('gitexplore');
      expect(result.prompt).toContain('healthGrade');
      expect(result.prompt).toContain('vitalityStatus');
      expect(result.prompt).toContain('actionableRecommendations');
      expect(result.systemInstruction).toContain('GitExplore AI');
    });
  });

  describe('Schema Validation (RepositoryHealthResponseSchema)', () => {
    it('validates a complete, compliant repository health response', () => {
      const parsed = RepositoryHealthResponseSchema.parse(validHealthFixture);
      expect(parsed.healthGrade).toBe('A');
      expect(parsed.healthScore).toBe(94);
      expect(parsed.vitalityStatus).toBe('THRIVING');
      expect(parsed.maintenanceSignals).toHaveLength(2);
      expect(parsed.actionableRecommendations).toHaveLength(2);
      expect(parsed.recommendations).toHaveLength(2);
    });

    it('derives default healthScore and aliases when omitted', () => {
      const parsed = RepositoryHealthResponseSchema.parse({
        healthGrade: 'B',
        vitalityStatus: 'HEALTHY',
        summary: 'Solid maintainability with steady release cadence.',
        actionableRecommendations: ['Keep dependencies updated.'],
      });

      expect(parsed.healthGrade).toBe('B');
      expect(parsed.healthScore).toBe(82);
      expect(parsed.activityAssessment).toContain('healthy');
      expect(parsed.recommendations).toEqual(['Keep dependencies updated.']);
    });

    it('rejects invalid healthGrade or missing summary', () => {
      expect(() => {
        RepositoryHealthResponseSchema.parse({
          healthGrade: 'INVALID_GRADE',
          vitalityStatus: 'HEALTHY',
          summary: 'Good repo',
        });
      }).toThrow();

      expect(() => {
        RepositoryHealthResponseSchema.parse({
          healthGrade: 'A',
          vitalityStatus: 'HEALTHY',
          summary: '',
        });
      }).toThrow();
    });
  });

  describe('POST /api/ai/repository-health Endpoint', () => {
    it('analyzes prebuilt context successfully', async () => {
      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({
          context: {
            repository: { name: 'gitexplore', starsCount: 150 },
            activityMetrics: { totalCommits: 45 },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('REPOSITORY_HEALTH');
      expect(response.body.cached).toBe(false);
      expect(response.body.data.healthGrade).toBe('A');
      expect(response.body.data.vitalityStatus).toBe('THRIVING');
    });

    it('analyzes structured repository, statistics, and evolution objects', async () => {
      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({
          repo: sampleRepo,
          statistics: sampleStatistics,
          evolution: sampleEvolution,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('REPOSITORY_HEALTH');
      expect(response.body.data.healthScore).toBe(94);
      expect(response.body.data.actionableRecommendations).toHaveLength(2);
    });

    it('dynamically fetches GitHub repo telemetry when given owner and repo', async () => {
      vi.mocked(githubClient.getRepo).mockResolvedValueOnce(sampleRepo);
      vi.mocked(githubClient.getCommits).mockResolvedValueOnce([
        {
          sha: 'c1',
          commit: {
            author: { name: 'Dev', email: 'dev@example.com', date: '2026-10-01T00:00:00Z' },
            committer: { name: 'Dev', email: 'dev@example.com', date: '2026-10-01T00:00:00Z' },
            message: 'feat: initial commit',
          },
          author: { login: 'dev', id: 1, avatar_url: '', html_url: '' },
        } as any,
      ]);
      vi.mocked(githubClient.getCommit).mockResolvedValueOnce({
        sha: 'c1',
        files: [{ filename: 'src/index.ts', additions: 10, deletions: 2, changes: 12 }],
      } as any);

      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
        });

      expect(response.status).toBe(200);
      expect(githubClient.getRepo).toHaveBeenCalledWith('h4mcodes', 'gitexplore');
      expect(response.body.data.healthGrade).toBe('A');
    });

    it('works with the alias route POST /api/ai/code-health', async () => {
      const response = await request(app)
        .post('/api/ai/code-health')
        .send({
          repo: sampleRepo,
          statistics: sampleStatistics,
          evolution: sampleEvolution,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('REPOSITORY_HEALTH');
      expect(response.body.data.vitalityStatus).toBe('THRIVING');
    });

    it('returns cached response on second identical request', async () => {
      const payload = {
        repo: sampleRepo,
        statistics: sampleStatistics,
        evolution: sampleEvolution,
      };

      const res1 = await request(app).post('/api/ai/repository-health').send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.cached).toBe(false);

      const res2 = await request(app).post('/api/ai/repository-health').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.cached).toBe(true);
      expect(res2.body.contextHash).toBe(res1.body.contextHash);
      expect(res2.body.data).toEqual(res1.body.data);
    });

    it('bypasses cache when bypassCache is true', async () => {
      const payload = {
        repo: sampleRepo,
        statistics: sampleStatistics,
        evolution: sampleEvolution,
      };

      await request(app).post('/api/ai/repository-health').send(payload);

      const resBypass = await request(app)
        .post('/api/ai/repository-health')
        .send({ ...payload, bypassCache: true });

      expect(resBypass.status).toBe(200);
      expect(resBypass.body.cached).toBe(false);
    });

    it('rejects request with HTTP 400 when missing all input variants', async () => {
      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_REPOSITORY_HEALTH_INPUT');
    });

    it('handles provider rate limits gracefully with HTTP 429', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Rate limit exhausted');
      });

      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({
          repo: sampleRepo,
          statistics: sampleStatistics,
          evolution: sampleEvolution,
        });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
    });

    it('handles provider timeouts gracefully with HTTP 504', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini request timed out');
      });

      const response = await request(app)
        .post('/api/ai/repository-health')
        .send({
          repo: sampleRepo,
          statistics: sampleStatistics,
          evolution: sampleEvolution,
        });

      expect(response.status).toBe(504);
      expect(response.body.code).toBe('AI_TIMEOUT');
    });
  });
});
