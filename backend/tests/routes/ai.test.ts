import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  AIRateLimitError,
  AITimeoutError,
  AIConfigurationError,
} from '../../src/ai/types.js';
import type { AIAnalysis } from '@prisma/client';

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
      id: `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

describe('AI Routes & Pipeline Integration (D6-P6)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    dbStore.clear();

    mockProvider = new MockAIProvider({ model: 'mock-model-v2' });
    mockProvider.setMockResponse((req) => {
      switch (req.type) {
        case 'REPOSITORY_OVERVIEW':
          return JSON.stringify({
            summary: 'GitExplore is an intelligence platform for developers.',
            primaryStack: ['TypeScript', 'JavaScript', 'React', 'Express'],
            activityLevel: 'HIGH',
            architectureObservations: ['Frontend SPA talking to Express API'],
            hotspotAnalysis: {
              criticalFiles: ['src/index.css', 'backend/src/ai/cache.ts'],
              observations: 'Frequent updates in caching and design tokens',
            },
            growthTrajectory: 'Steady growth across sprints',
            keyTakeaways: ['Clean modular architecture', 'Strict TypeScript'],
          });

        case 'COMMIT_EXPLANATION':
          return JSON.stringify({
            intent: 'BUGFIX',
            summary: 'Fix race condition in cache invalidation',
            technicalImpact: 'Prevents stale reads during concurrent queries',
            modifiedComponents: [
              {
                filename: 'src/cache.ts',
                summary: 'Added atomic mutex lock before write',
                riskLevel: 'LOW',
              },
            ],
            potentialRisks: ['Minor latency increase under high write load'],
            isBreakingChange: false,
          });

        case 'DIFF_REVIEW':
          return JSON.stringify({
            overallAssessment: 'APPROVED',
            summary: 'Refactored cache module to use atomic operations',
            netChangesSummary: '+12 -3 lines',
            fileReviews: [
              {
                filename: 'src/cache.ts',
                status: 'modified',
                feedback: 'Good defensive mutex handling',
                issuesFound: [],
              },
            ],
            riskFactors: ['Low risk change'],
            recommendations: ['Merge after CI passes'],
          });

        case 'BRANCH_ANALYSIS':
          return JSON.stringify({
            divergenceSummary: 'Feature branch is ahead by 4 commits and behind by 1.',
            syncStatus: 'AHEAD',
            mergeReadiness: 'READY',
            keyContributions: ['Implemented AI API routes'],
            mainAuthors: ['Dev'],
            riskFactors: ['No conflicting files identified.'],
            recommendations: ['Safe to rebase and merge.'],
          });

        case 'REPOSITORY_HEALTH':
          return JSON.stringify({
            healthGrade: 'A',
            vitalityStatus: 'HEALTHY',
            summary: 'Healthy project with consistent contribution cadence.',
            trajectoryAssessment: 'Consistent commits and low issue backlog.',
            maintenanceRisks: [],
            codeChurnHotspots: ['src/index.css'],
            actionableRecommendations: ['Keep dependencies up to date'],
          });

        case 'REPOSITORY_QA':
          return JSON.stringify({
            answer: 'GitExplore uses Express with TypeScript and Prisma ORM.',
            confidence: 'HIGH',
            supportingEvidence: ['package.json', 'prisma/schema.prisma'],
            limitations: null,
            suggestedFollowUps: ['What database does it connect to?'],
          });

        case 'CUSTOM':
          return JSON.stringify({
            customOutput: 'Custom prompt response',
          });

        default:
          return JSON.stringify({ raw: 'default mock' });
      }
    });

    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('GET /api/ai/status', () => {
    it('returns provider readiness, model, and supported analysis types', async () => {
      const res = await request(app).get('/api/ai/status');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        provider: 'mock',
        model: 'mock-model-v2',
        available: true,
        configured: true,
        supportedAnalyses: [
          'REPOSITORY_OVERVIEW',
          'COMMIT_EXPLANATION',
          'DIFF_REVIEW',
          'BRANCH_ANALYSIS',
          'REPOSITORY_HEALTH',
          'REPOSITORY_QA',
        ],
      });
    });
  });

  describe('POST /api/ai/analyze (Universal Dispatcher)', () => {
    it('returns 400 when analysis type is missing', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ context: { sample: 'data' } });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when analysis type is invalid', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ type: 'INVALID_TYPE', context: { sample: 'data' } });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when neither context nor input is provided', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ type: 'REPOSITORY_OVERVIEW' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_ANALYSIS_CONTEXT');
    });

    it('executes analysis successfully with valid context on first call (cached: false)', async () => {
      const payload = {
        type: 'REPOSITORY_OVERVIEW',
        context: {
          repository: {
            name: 'gitexplore',
            owner: 'h4mcodes',
            description: 'Git Intelligence',
          },
        },
      };

      const res = await request(app).post('/api/ai/analyze').send(payload);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_OVERVIEW');
      expect(res.body.cached).toBe(false);
      expect(res.body.contextHash).toHaveLength(64);
      expect(res.body.data.summary).toContain('GitExplore');
      expect(res.body.data.activityLevel).toBe('HIGH');
      expect(res.body.tokenUsage.totalTokens).toBe(150);
      expect(res.body.analysisId).toBeDefined();
    });

    it('returns cached response on repeated call with identical context (cached: true)', async () => {
      const payload = {
        type: 'REPOSITORY_OVERVIEW',
        context: {
          repository: {
            name: 'cached-repo',
            owner: 'testowner',
          },
        },
      };

      const firstRes = await request(app).post('/api/ai/analyze').send(payload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.cached).toBe(false);

      const secondRes = await request(app).post('/api/ai/analyze').send(payload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.cached).toBe(true);
      expect(secondRes.body.contextHash).toBe(firstRes.body.contextHash);
      expect(secondRes.body.data).toEqual(firstRes.body.data);
    });

    it('bypasses cache when bypassCache: true is provided', async () => {
      const payload = {
        type: 'REPOSITORY_OVERVIEW',
        context: {
          repository: {
            name: 'bypass-repo',
            owner: 'testowner',
          },
        },
      };

      await request(app).post('/api/ai/analyze').send(payload);

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ ...payload, bypassCache: true });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
    });
  });

  describe('Feature Endpoints', () => {
    it('POST /api/ai/repository-overview processes repository overview from repo input', async () => {
      const res = await request(app)
        .post('/api/ai/repository-overview')
        .send({
          repo: {
            id: 1,
            name: 'gitexplore',
            full_name: 'h4mcodes/gitexplore',
            owner: { login: 'h4mcodes' },
            stargazers_count: 50,
            forks_count: 10,
            open_issues_count: 2,
            default_branch: 'main',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
            pushed_at: '2026-10-02T00:00:00Z',
            size: 1024,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_OVERVIEW');
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.primaryStack).toContain('React');
    });

    it('POST /api/ai/commit-explanation processes commit explanation from commit input', async () => {
      const res = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          commit: {
            sha: 'abcdef1234567890',
            commit: {
              message: 'Fix memory leak in websocket listener',
              author: { name: 'Dev', date: '2026-10-02T10:00:00Z' },
            },
            files: [
              {
                filename: 'src/ws.ts',
                status: 'modified',
                additions: 5,
                deletions: 2,
                changes: 7,
                patch: '@@ -1,5 +1,8 @@\n+cleanupListeners();',
              },
            ],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('COMMIT_EXPLANATION');
      expect(res.body.data.intent).toBe('BUGFIX');
      expect(res.body.data.modifiedComponents).toHaveLength(1);
    });

    it('POST /api/ai/diff-review processes diff review from files input', async () => {
      const res = await request(app)
        .post('/api/ai/diff-review')
        .send({
          title: 'Review cache PR',
          files: [
            {
              filename: 'src/cache.ts',
              status: 'modified',
              additions: 12,
              deletions: 3,
              changes: 15,
              patch: '@@ -10,3 +10,12 @@',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('DIFF_REVIEW');
      expect(res.body.data.overallAssessment).toBe('APPROVED');
      expect(res.body.data.fileReviews).toHaveLength(1);
    });

    it('POST /api/ai/branch-analysis and alias /branch-comparison return divergence analysis', async () => {
      const divergenceData = {
        divergence: {
          baseRef: 'main',
          headRef: 'feature/ai',
          status: 'ahead',
          aheadBy: 4,
          behindBy: 1,
          mergeBaseSha: '111222333',
          mergeBaseMessage: 'Initial setup',
          delta: {
            totalCommits: 4,
            totalFilesChanged: 8,
            totalAdditions: 400,
            totalDeletions: 50,
            authors: [{ name: 'Dev', commitCount: 4 }],
            commitMessages: ['feat: add AI router'],
          },
        },
      };

      const res1 = await request(app)
        .post('/api/ai/branch-analysis')
        .send(divergenceData);
      expect(res1.status).toBe(200);
      expect(res1.body.type).toBe('BRANCH_ANALYSIS');
      expect(res1.body.data.divergenceSummary).toBeDefined();

      const res2 = await request(app)
        .post('/api/ai/branch-comparison')
        .send(divergenceData);
      expect(res2.status).toBe(200);
      expect(res2.body.type).toBe('BRANCH_ANALYSIS');
    });

    it('POST /api/ai/repository-health and alias /code-health return health assessment', async () => {
      const healthData = {
        repo: {
          name: 'gitexplore',
          stargazers_count: 100,
          forks_count: 20,
          open_issues_count: 5,
          created_at: '2026-01-01T00:00:00Z',
          pushed_at: '2026-10-02T00:00:00Z',
        },
        statistics: {
          totalCommits: 85,
          frequency: {
            commitsPerWeek: 12,
            activeDaysCount: 40,
            timeSpanDays: 120,
            firstCommitDate: '2026-01-01',
            lastCommitDate: '2026-10-02',
          },
          changeStats: { totalAdditions: 5000, totalDeletions: 1200, avgChangesPerCommit: 72 },
        },
        evolution: {
          trajectory: {
            pattern: 'STEADY_GROWTH',
            description: 'Consistent commits',
            momentumMultiplier: 1.2,
            recentVelocity: 2.1,
            previousVelocity: 1.8,
          },
          periods: [
            { intensity: 'HIGH', commitCount: 20, startDate: '2026-09-01', endDate: '2026-10-01' },
          ],
        },
      };

      const res = await request(app)
        .post('/api/ai/repository-health')
        .send(healthData);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_HEALTH');
      expect(res.body.data.healthGrade).toBe('A');
      expect(res.body.data.vitalityStatus).toBe('HEALTHY');

      const aliasRes = await request(app)
        .post('/api/ai/code-health')
        .send(healthData);
      expect(aliasRes.status).toBe(200);
      expect(aliasRes.body.type).toBe('REPOSITORY_HEALTH');
    });

    it('POST /api/ai/qa answers question grounded in repo data', async () => {
      const res = await request(app)
        .post('/api/ai/qa')
        .send({
          question: 'What stack is used in this repository?',
          repo: {
            name: 'gitexplore',
            owner: { login: 'h4mcodes' },
            language: 'TypeScript',
            default_branch: 'main',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_QA');
      expect(res.body.data.answer).toContain('Express');
      expect(res.body.data.confidence).toBe('HIGH');
      expect(res.body.data.supportingEvidence).toContain('package.json');
    });
  });

  describe('Error Handling & Resilience', () => {
    it('returns HTTP 429 when AI provider rate limit is exceeded', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Gemini API quota exhausted');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { sample: 123 },
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.body.error).toContain('quota exhausted');
    });

    it('returns HTTP 504 when AI provider times out', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Inference request timed out after 30000ms');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { sample: 123 },
        });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
      expect(res.body.error).toContain('timed out');
    });

    it('returns HTTP 502 when AI provider returns unparseable or schema-violating output', async () => {
      mockProvider.setMockResponse(() => {
        return 'Not valid JSON output from LLM';
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { sample: 123 },
        });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('AI_INVALID_RESPONSE');
    });

    it('returns HTTP 500 when AI provider is not configured properly', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIConfigurationError('GEMINI_API_KEY is not configured');
      });

      const res = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'REPOSITORY_OVERVIEW',
          context: { sample: 123 },
        });

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('AI_CONFIGURATION_ERROR');
    });
  });
});
