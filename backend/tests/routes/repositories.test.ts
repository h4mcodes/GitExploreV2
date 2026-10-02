import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { githubClient } from '../../src/github/client.js';
import { clearAnalysisCache } from '../../src/controllers/repositoryController.js';
import { NotFoundError } from '../../src/types/api.js';
import type {
  GithubApiRepo,
  GithubApiBranch,
  GithubApiCommitSummary,
  GithubApiCommitDetail,
  GithubApiComparison,
} from '../../src/github/types.js';

// Mock the githubClient methods
vi.mock('../../src/github/client.js', () => ({
  githubClient: {
    getUser: vi.fn(),
    getUserRepos: vi.fn(),
    getRepo: vi.fn(),
    getBranches: vi.fn(),
    getCommits: vi.fn(),
    getCommit: vi.fn(),
    compareCommits: vi.fn(),
    getRateLimitInfo: vi.fn(),
  },
}));

describe('Repositories Intelligence Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    clearAnalysisCache();
  });

  const mockRepoMeta: GithubApiRepo = {
    id: 12345,
    name: 'gitexplore',
    full_name: 'h4mza/gitexplore',
    owner: {
      login: 'h4mza',
      id: 1,
      avatar_url: 'https://avatar.url',
    },
    description: 'Repository intelligence platform',
    private: false,
    html_url: 'https://github.com/h4mza/gitexplore',
    url: 'https://api.github.com/repos/h4mza/gitexplore',
    fork: false,
    language: 'TypeScript',
    stargazers_count: 120,
    watchers_count: 120,
    forks_count: 30,
    open_issues_count: 2,
    default_branch: 'main',
    updated_at: '2026-10-01T12:00:00Z',
    pushed_at: '2026-10-01T14:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    homepage: null,
    size: 5000,
  };


  const mockBranches: GithubApiBranch[] = [
    {
      name: 'main',
      commit: {
        sha: 'c111111111111111111111111111111111111111',
        url: 'https://api.github.com/repos/h4mza/gitexplore/commits/c1',
      },
      protected: true,
    },
    {
      name: 'feature-divergence',
      commit: {
        sha: 'c222222222222222222222222222222222222222',
        url: 'https://api.github.com/repos/h4mza/gitexplore/commits/c2',
      },
      protected: false,
    },
  ];

  const mockCommits: GithubApiCommitSummary[] = [
    {
      sha: 'c111111111111111111111111111111111111111',
      html_url: 'https://github.com/h4mza/gitexplore/commit/c1',
      commit: {
        author: { name: 'Hamza', email: 'hamza@example.com', date: '2026-10-01T12:00:00Z' },
        committer: { name: 'Hamza', email: 'hamza@example.com', date: '2026-10-01T12:00:00Z' },
        message: 'feat: add intelligence pipeline',
        comment_count: 0,
      },
      author: { login: 'h4mza', id: 1, avatar_url: 'https://avatar.url', html_url: 'https://github.com/h4mza' },
      committer: null,
      parents: [{ sha: 'c000000000000000000000000000000000000000', url: '' }],
    },
    {
      sha: 'c000000000000000000000000000000000000000',
      html_url: 'https://github.com/h4mza/gitexplore/commit/c0',
      commit: {
        author: { name: 'Hamza', email: 'hamza@example.com', date: '2026-09-01T10:00:00Z' },
        committer: { name: 'Hamza', email: 'hamza@example.com', date: '2026-09-01T10:00:00Z' },
        message: 'initial commit',
        comment_count: 0,
      },
      author: { login: 'h4mza', id: 1, avatar_url: 'https://avatar.url', html_url: 'https://github.com/h4mza' },
      committer: null,
      parents: [],
    },
  ];

  const mockCommitDetail: GithubApiCommitDetail = {
    sha: 'c111111111111111111111111111111111111111',
    html_url: 'https://github.com/h4mza/gitexplore/commit/c1',
    commit: {
      author: { name: 'Hamza', email: 'hamza@example.com', date: '2026-10-01T12:00:00Z' },
      committer: { name: 'Hamza', email: 'hamza@example.com', date: '2026-10-01T12:00:00Z' },
      message: 'feat: add intelligence pipeline',
      comment_count: 0,
    },
    author: { login: 'h4mza', id: 1, avatar_url: '', html_url: '' },
    committer: null,
    parents: [{ sha: 'c000000000000000000000000000000000000000', url: '' }],
    stats: { total: 45, additions: 40, deletions: 5 },
    files: [
      {
        filename: 'src/pipeline.ts',
        status: 'added',
        additions: 40,
        deletions: 5,
        changes: 45,
        patch: '@@ -0,0 +1,40 @@',
      },
    ],
  };

  const mockComparison: GithubApiComparison = {
    url: 'https://api.github.com/repos/h4mza/gitexplore/compare/main...feature-divergence',
    html_url: 'https://github.com/h4mza/gitexplore/compare/main...feature-divergence',
    permalink_url: '',
    diff_url: '',
    patch_url: '',
    base_commit: {
      sha: 'c111111111111111111111111111111111111111',
      html_url: '',
      commit: { author: null, committer: null, message: 'main head', comment_count: 0 },
      author: null,
      committer: null,
      parents: [],
    },
    merge_base_commit: {
      sha: 'c000000000000000000000000000000000000000',
      html_url: '',
      commit: { author: null, committer: null, message: 'base', comment_count: 0 },
      author: null,
      committer: null,
      parents: [],
    },
    status: 'diverged',
    ahead_by: 2,
    behind_by: 1,
    total_commits: 2,
    commits: [mockCommits[0] as GithubApiCommitSummary],
    files: [{ filename: 'src/feature.ts', status: 'modified', additions: 15, deletions: 3, changes: 18 }],
  };

  describe('GET /api/repositories/:owner/:repo/analysis', () => {
    it('returns HTTP 404 when repository has not been analyzed yet', async () => {
      const response = await request(app).get('/api/repositories/h4mza/gitexplore/analysis');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('ANALYSIS_NOT_FOUND');
      expect(response.body.error).toContain('Trigger analysis with POST');
    });

    it('returns HTTP 400 when invalid repository owner or name is passed', async () => {
      const response = await request(app).get('/api/repositories/-invalid-owner/invalid@repo/analysis');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 200 with cached analysis after POST analyze has run', async () => {
      vi.mocked(githubClient.getRepo).mockResolvedValueOnce(mockRepoMeta);
      vi.mocked(githubClient.getBranches).mockResolvedValueOnce(mockBranches);
      vi.mocked(githubClient.getCommits).mockResolvedValueOnce(mockCommits);
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);
      vi.mocked(githubClient.compareCommits).mockResolvedValueOnce(mockComparison);

      // Trigger analysis via POST
      const postResponse = await request(app).post('/api/repositories/h4mza/gitexplore/analyze');
      expect(postResponse.status).toBe(200);

      // Retrieve cached analysis via GET
      const getResponse = await request(app).get('/api/repositories/h4mza/gitexplore/analysis');
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.owner).toBe('h4mza');
      expect(getResponse.body.repo).toBe('gitexplore');
      expect(getResponse.body.graph.totalCommits).toBe(2);
      expect(getResponse.body.statistics.totalCommits).toBe(2);
      expect(getResponse.body.divergence).not.toBeNull();
      expect(getResponse.body.fileAnalysis.hotspots.length).toBeGreaterThan(0);
      expect(getResponse.body.evolution.monthlyBuckets.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/repositories/:owner/:repo/analyze', () => {
    it('successfully analyzes repository, returns full intelligence payload and stores in cache', async () => {
      vi.mocked(githubClient.getRepo).mockResolvedValueOnce(mockRepoMeta);
      vi.mocked(githubClient.getBranches).mockResolvedValueOnce(mockBranches);
      vi.mocked(githubClient.getCommits).mockResolvedValueOnce(mockCommits);
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);
      vi.mocked(githubClient.compareCommits).mockResolvedValueOnce(mockComparison);

      const response = await request(app)
        .post('/api/repositories/h4mza/gitexplore/analyze')
        .send({ branch: 'main' });

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe('h4mza');
      expect(response.body.repo).toBe('gitexplore');
      expect(response.body.defaultBranch).toBe('main');

      // 1. Verify DAG Graph
      expect(response.body.graph).toBeDefined();
      expect(response.body.graph.totalCommits).toBe(2);
      expect(response.body.graph.nodes['c111111111111111111111111111111111111111']).toBeDefined();

      // 2. Verify Statistics
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.frequency.totalCommits).toBe(2);
      expect(response.body.statistics.changeStats.totalAdditions).toBeGreaterThan(0);

      // 3. Verify Divergence
      expect(response.body.divergence).toBeDefined();
      expect(response.body.divergence?.status).toBe('diverged');
      expect(response.body.divergence?.aheadBy).toBe(2);

      // 4. Verify File Analysis
      expect(response.body.fileAnalysis).toBeDefined();
      expect(response.body.fileAnalysis.totalAdditions).toBeGreaterThan(0);
      expect(response.body.fileAnalysis.fileExtensions['.ts']).toBeGreaterThan(0);

      // 5. Verify Evolution

      expect(response.body.evolution).toBeDefined();
      expect(response.body.evolution.totalCommits).toBe(2);
      expect(response.body.evolution.trajectory).toBeDefined();

      // Verify client calls
      expect(githubClient.getRepo).toHaveBeenCalledWith('h4mza', 'gitexplore');
      expect(githubClient.getBranches).toHaveBeenCalledWith('h4mza', 'gitexplore', { per_page: 30 });
      expect(githubClient.getCommits).toHaveBeenCalledWith('h4mza', 'gitexplore', {
        sha: 'main',
        per_page: 100,
      });
      expect(githubClient.compareCommits).toHaveBeenCalledWith(
        'h4mza',
        'gitexplore',
        'main',
        'feature-divergence'
      );
    });

    it('gracefully handles repository with single branch where divergence is null', async () => {
      const singleBranch: GithubApiBranch[] = [
        {
          name: 'main',
          commit: {
            sha: 'c111111111111111111111111111111111111111',
            url: '',
          },
          protected: true,
        },
      ];

      vi.mocked(githubClient.getRepo).mockResolvedValueOnce(mockRepoMeta);
      vi.mocked(githubClient.getBranches).mockResolvedValueOnce(singleBranch);
      vi.mocked(githubClient.getCommits).mockResolvedValueOnce(mockCommits);
      vi.mocked(githubClient.getCommit).mockResolvedValue(mockCommitDetail);

      const response = await request(app).post('/api/repositories/h4mza/gitexplore/analyze');

      expect(response.status).toBe(200);
      expect(response.body.divergence).toBeNull();
      expect(githubClient.compareCommits).not.toHaveBeenCalled();
    });

    it('returns HTTP 404 when repository does not exist on GitHub', async () => {
      vi.mocked(githubClient.getRepo).mockRejectedValueOnce(
        new NotFoundError('GitHub resource not found', 'GITHUB_NOT_FOUND')
      );

      const response = await request(app).post('/api/repositories/h4mza/nonexistent-repo/analyze');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('GITHUB_NOT_FOUND');
    });

    it('returns HTTP 400 when invalid parameters are provided', async () => {
      const response = await request(app).post('/api/repositories/invalid@owner/valid-repo/analyze');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
