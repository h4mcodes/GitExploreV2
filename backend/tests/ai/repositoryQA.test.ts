import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import {
  RepositoryQAResponseSchema,
  type RepositoryQAResponse,
} from '../../src/ai/schemas/repositoryQA.js';
import {
  buildRepositoryQAPrompt,
  REPOSITORY_QA_PROMPT_VERSION,
} from '../../src/ai/prompts/repositoryQA.js';
import { sanitizeUserQuestion } from '../../src/controllers/aiController.js';
import { githubClient } from '../../src/github/client.js';
import {
  AIRateLimitError,
  AITimeoutError,
} from '../../src/ai/types.js';
import { BadRequestError } from '../../src/types/api.js';
import type { AIAnalysis } from '@prisma/client';
import type { GithubApiRepo, GithubApiCommit, GithubApiCommitDetail } from '../../src/github/types.js';

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
      id: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

describe('AI Repository Q&A — Feature Specification (D8-P2)', () => {
  const app = createApp();
  let mockProvider: MockAIProvider;

  const validQAFixture: RepositoryQAResponse = {
    answer: 'The repository primarily uses TypeScript and focuses on repository intelligence and change analysis.',
    confidence: 'HIGH',
    supportingEvidence: [
      'Primary language detected is TypeScript across 90% of files.',
      'Active commit velocity with 45 commits over the last 30 days.',
      'Recent commits touch core intelligence graph and analysis pipelines.',
    ],
    limitations: 'Issue tracker history was not inspected in this investigation scope.',
    suggestedFollowUps: [
      'What are the most active files and churn hotspots in this repository?',
      'Who are the primary contributors over the last 30 days?',
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
    description: 'Git repository intelligence and management platform',
    fork: false,
    url: 'https://api.github.com/repos/h4mcodes/gitexplore',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-04T12:00:00Z',
    pushed_at: '2026-10-04T12:00:00Z',
    stargazers_count: 220,
    watchers_count: 220,
    language: 'TypeScript',
    forks_count: 35,
    open_issues_count: 4,
    default_branch: 'main',
  };

  const sampleCommits: GithubApiCommit[] = [
    {
      sha: 'a1b2c3d4e5f67890123456789abcdef012345678',
      node_id: 'C_1',
      commit: {
        author: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-10-04T10:00:00Z',
        },
        committer: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-10-04T10:00:00Z',
        },
        message: 'feat: add repository investigation context engine',
        tree: { sha: 'tree1', url: 'https://api.github.com/trees/tree1' },
        url: 'https://api.github.com/commits/a1b2c3d',
        comment_count: 0,
      },
      url: 'https://api.github.com/commits/a1b2c3d',
      html_url: 'https://github.com/h4mcodes/gitexplore/commit/a1b2c3d',
      comments_url: 'https://api.github.com/commits/a1b2c3d/comments',
      author: {
        login: 'h4mcodes',
        id: 1,
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        html_url: 'https://github.com/h4mcodes',
      },
      parents: [
        {
          sha: 'b2c3d4e5f67890123456789abcdef0123456789a',
          url: 'https://api.github.com/commits/b2c3d4e',
          html_url: 'https://github.com/h4mcodes/gitexplore/commit/b2c3d4e',
        },
      ],
    },
    {
      sha: 'b2c3d4e5f67890123456789abcdef0123456789a',
      node_id: 'C_2',
      commit: {
        author: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-10-02T10:00:00Z',
        },
        committer: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-10-02T10:00:00Z',
        },
        message: 'feat: implement commit DAG relationship graph',
        tree: { sha: 'tree2', url: 'https://api.github.com/trees/tree2' },
        url: 'https://api.github.com/commits/b2c3d4e',
        comment_count: 0,
      },
      url: 'https://api.github.com/commits/b2c3d4e',
      html_url: 'https://github.com/h4mcodes/gitexplore/commit/b2c3d4e',
      comments_url: 'https://api.github.com/commits/b2c3d4e/comments',
      author: {
        login: 'h4mcodes',
        id: 1,
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
        html_url: 'https://github.com/h4mcodes',
      },
      parents: [],
    },
  ];

  const sampleCommitDetail: GithubApiCommitDetail = {
    ...sampleCommits[0],
    stats: {
      total: 120,
      additions: 100,
      deletions: 20,
    },
    files: [
      {
        sha: 'f1',
        filename: 'src/ai/contextBuilder.ts',
        status: 'modified',
        additions: 80,
        deletions: 15,
        changes: 95,
        blob_url: 'https://github.com/h4mcodes/gitexplore/blob/a1b2c3d/src/ai/contextBuilder.ts',
        raw_url: 'https://github.com/h4mcodes/gitexplore/raw/a1b2c3d/src/ai/contextBuilder.ts',
        contents_url: 'https://api.github.com/repos/h4mcodes/gitexplore/contents/src/ai/contextBuilder.ts',
        patch: '@@ -1,5 +1,10 @@\n+export function buildContext() {}',
      },
    ],
  };

  beforeEach(() => {
    dbStore.clear();
    vi.clearAllMocks();
    mockProvider = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockProvider.setMockResponse(() => JSON.stringify(validQAFixture));
    setAIProvider(mockProvider);
  });

  afterEach(() => {
    resetAIProvider();
  });

  describe('Input Sanitization (sanitizeUserQuestion)', () => {
    it('strips null bytes and control characters from question', () => {
      const dirty = 'What does this repo do?\u0000\u0007\u001b';
      const clean = sanitizeUserQuestion(dirty);
      expect(clean).toBe('What does this repo do?');
    });

    it('trims leading and trailing whitespace', () => {
      const padded = '   How are commits structured?   \n  ';
      const clean = sanitizeUserQuestion(padded);
      expect(clean).toBe('How are commits structured?');
    });

    it('caps questions longer than 500 characters to 500 characters', () => {
      const longQuestion = 'a'.repeat(600);
      const clean = sanitizeUserQuestion(longQuestion);
      expect(clean.length).toBe(500);
      expect(clean).toBe('a'.repeat(500));
    });

    it('throws BadRequestError with EMPTY_QUESTION for empty string or only whitespace', () => {
      expect(() => sanitizeUserQuestion('')).toThrow(BadRequestError);
      expect(() => sanitizeUserQuestion('   \t  \n  ')).toThrow(BadRequestError);
      try {
        sanitizeUserQuestion('  ');
      } catch (err: any) {
        expect(err.code).toBe('EMPTY_QUESTION');
      }
    });

    it('throws BadRequestError with INVALID_QUESTION for non-string inputs', () => {
      expect(() => sanitizeUserQuestion(null)).toThrow(BadRequestError);
      expect(() => sanitizeUserQuestion(undefined)).toThrow(BadRequestError);
      expect(() => sanitizeUserQuestion(12345)).toThrow(BadRequestError);
      expect(() => sanitizeUserQuestion({ query: 'test' })).toThrow(BadRequestError);
      try {
        sanitizeUserQuestion(null);
      } catch (err: any) {
        expect(err.code).toBe('INVALID_QUESTION');
      }
    });
  });

  describe('Prompt Construction & Versioning (buildRepositoryQAPrompt)', () => {
    it('constructs prompt containing question, context JSON, and schema instructions', () => {
      const result = buildRepositoryQAPrompt({
        question: 'What is the commit frequency?',
        repository: {
          name: 'gitexplore',
          owner: 'h4mcodes',
        },
      });

      expect(result.version).toBe(REPOSITORY_QA_PROMPT_VERSION);
      expect(result.prompt).toContain('What is the commit frequency?');
      expect(result.prompt).toContain('"answer"');
      expect(result.prompt).toContain('"confidence"');
      expect(result.prompt).toContain('"supportingEvidence"');
      expect(result.prompt).toContain('"suggestedFollowUps"');
      expect(result.systemInstruction).toContain('GitExplore AI');
    });

    it('falls back to investigationQuery or generic prompt if question is missing', () => {
      const fromInvestigation = buildRepositoryQAPrompt({
        investigationQuery: 'Explain branch divergence',
      });
      expect(fromInvestigation.prompt).toContain('Explain branch divergence');

      const generic = buildRepositoryQAPrompt({});
      expect(generic.prompt).toContain('Analyze this repository.');
    });
  });

  describe('Schema Validation (RepositoryQAResponseSchema)', () => {
    it('validates a complete, compliant QA response', () => {
      const parsed = RepositoryQAResponseSchema.parse(validQAFixture);
      expect(parsed.answer).toBe(validQAFixture.answer);
      expect(parsed.confidence).toBe('HIGH');
      expect(parsed.supportingEvidence).toHaveLength(3);
      expect(parsed.suggestedFollowUps).toHaveLength(2);
    });

    it('normalizes confidence case-insensitively and sets defaults for arrays', () => {
      const minimal = {
        answer: 'This is a test answer.',
        confidence: 'medium',
      };
      const parsed = RepositoryQAResponseSchema.parse(minimal);
      expect(parsed.confidence).toBe('MEDIUM');
      expect(parsed.supportingEvidence).toEqual([]);
      expect(parsed.suggestedFollowUps).toEqual([]);
      expect(parsed.limitations).toBeUndefined();
    });

    it('rejects empty answer', () => {
      const invalid = {
        answer: '',
      };
      expect(() => RepositoryQAResponseSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid confidence level', () => {
      const invalid = {
        answer: 'Valid answer',
        confidence: 'SUPER_HIGH',
      };
      expect(() => RepositoryQAResponseSchema.parse(invalid)).toThrow();
    });
  });

  describe('Route: POST /api/ai/repository-qa', () => {
    it('answers question using prebuilt context payload', async () => {
      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 'What is this repository?',
          context: {
            question: 'What is this repository?',
            repository: { name: 'gitexplore', owner: 'h4mcodes' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_QA');
      expect(res.body.cached).toBe(false);
      expect(res.body.data.answer).toBe(validQAFixture.answer);
      expect(res.body.data.confidence).toBe('HIGH');
      expect(res.body.data.supportingEvidence).toHaveLength(3);
    });

    it('answers question using repo object and user-supplied telemetry', async () => {
      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 'What are the main features of gitexplore?',
          repo: sampleRepo,
          focusedContext: {
            activeFeature: 'DAG visualization',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_QA');
      expect(res.body.data.answer).toBe(validQAFixture.answer);
    });

    it('dynamically fetches repository metadata and commits when owner and repo coordinates are given', async () => {
      vi.mocked(githubClient.getRepo).mockResolvedValueOnce(sampleRepo);
      vi.mocked(githubClient.getCommits).mockResolvedValueOnce(sampleCommits);
      vi.mocked(githubClient.getCommit).mockResolvedValueOnce(sampleCommitDetail);

      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          owner: 'h4mcodes',
          repo: 'gitexplore',
          question: 'How fast is the repository evolving?',
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_QA');
      expect(res.body.data.answer).toBe(validQAFixture.answer);
      expect(githubClient.getRepo).toHaveBeenCalledWith('h4mcodes', 'gitexplore');
      expect(githubClient.getCommits).toHaveBeenCalledWith(
        'h4mcodes',
        'gitexplore',
        expect.objectContaining({ sha: 'main', per_page: 50 })
      );
    });

    it('returns cached response on repeated identical requests', async () => {
      const payload = {
        question: 'Cached question query test?',
        context: {
          question: 'Cached question query test?',
          repository: { name: 'gitexplore', owner: 'h4mcodes' },
        },
      };

      const res1 = await request(app).post('/api/ai/repository-qa').send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.cached).toBe(false);

      const res2 = await request(app).post('/api/ai/repository-qa').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.cached).toBe(true);
      expect(res2.body.data.answer).toBe(validQAFixture.answer);
    });

    it('bypasses cache when bypassCache: true is requested', async () => {
      const payload = {
        question: 'Cache bypass test?',
        context: {
          question: 'Cache bypass test?',
          repository: { name: 'gitexplore', owner: 'h4mcodes' },
        },
      };

      const res1 = await request(app).post('/api/ai/repository-qa').send(payload);
      expect(res1.body.cached).toBe(false);

      const res2 = await request(app)
        .post('/api/ai/repository-qa')
        .send({ ...payload, bypassCache: true });
      expect(res2.body.cached).toBe(false);
    });

    it('works identically via alias route POST /api/ai/qa', async () => {
      const res = await request(app)
        .post('/api/ai/qa')
        .send({
          question: 'What is this repo?',
          context: {
            question: 'What is this repo?',
            repository: { name: 'gitexplore' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('REPOSITORY_QA');
      expect(res.body.data.answer).toBe(validQAFixture.answer);
    });

    it('rejects empty question with 400 EMPTY_QUESTION', async () => {
      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: '   ',
          repo: sampleRepo,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Question cannot be empty');
      expect(res.body.code).toBe('EMPTY_QUESTION');
    });

    it('rejects non-string question with 400 INVALID_QUESTION', async () => {
      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 12345,
          repo: sampleRepo,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Question is required');
      expect(res.body.code).toBe('INVALID_QUESTION');
    });

    it('rejects request with neither context nor repository info with 400', async () => {
      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 'Where is the repository context?',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MISSING_REPOSITORY_QA_INPUT');
    });

    it('propagates AI provider rate limit error as 429', async () => {
      mockProvider.setMockResponse(() => {
        throw new AIRateLimitError('Gemini API rate limit exceeded', 30);
      });

      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 'Will this trigger rate limit?',
          context: { question: 'Will this trigger rate limit?' },
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('AI_RATE_LIMIT_EXCEEDED');
    });

    it('propagates AI provider timeout error as 504', async () => {
      mockProvider.setMockResponse(() => {
        throw new AITimeoutError('Gemini API call timed out', 15000);
      });

      const res = await request(app)
        .post('/api/ai/repository-qa')
        .send({
          question: 'Will this time out?',
          context: { question: 'Will this time out?' },
        });

      expect(res.status).toBe(504);
      expect(res.body.code).toBe('AI_TIMEOUT');
    });
  });
});
