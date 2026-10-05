import { describe, it, expect } from 'vitest';
import {
  truncateText,
  estimatePayloadTokens,
  buildRepositoryOverviewContext,
  buildCommitExplanationContext,
  buildDiffReviewContext,
  buildBranchAnalysisContext,
  buildRepositoryHealthContext,
  buildRepositoryQAContext,
  buildRepositoryInvestigationContext,
  buildAIContext,
} from '../../src/ai/contextBuilder.js';
import type {
  GithubApiRepo,
  GithubApiCommitDetail,
  GithubApiCommitFile,
  GithubApiComparison,
  GithubApiCommitSummary,
} from '../../src/github/types.js';
import type {
  CommitRelationshipGraph,
  CommitStatistics,
  BranchDivergenceAnalysis,
  FileChurnAnalysis,
  RepositoryEvolutionAnalysis,
} from '../../src/intelligence/types.js';

// Mock test fixtures
const mockRepo: GithubApiRepo = {
  id: 12345,
  node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NQ==',
  name: 'gitexplore',
  full_name: 'h4mcodes/gitexplore',
  private: false,
  owner: {
    login: 'h4mcodes',
    id: 100,
    node_id: 'MDQ6VXNlcjEwMA==',
    avatar_url: 'https://avatars.githubusercontent.com/u/100',
    gravatar_id: '',
    url: 'https://api.github.com/users/h4mcodes',
    html_url: 'https://github.com/h4mcodes',
    type: 'User',
    site_admin: false,
  },
  html_url: 'https://github.com/h4mcodes/gitexplore',
  description: 'Git repository intelligence workbench',
  fork: false,
  url: 'https://api.github.com/repos/h4mcodes/gitexplore',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  pushed_at: '2026-03-02T15:30:00Z',
  git_url: 'git://github.com/h4mcodes/gitexplore.git',
  ssh_url: 'git@github.com:h4mcodes/gitexplore.git',
  clone_url: 'https://github.com/h4mcodes/gitexplore.git',
  svn_url: 'https://github.com/h4mcodes/gitexplore',
  homepage: 'https://gitexplore.dev',
  size: 4096,
  stargazers_count: 350,
  watchers_count: 350,
  language: 'TypeScript',
  has_issues: true,
  has_projects: true,
  has_downloads: true,
  has_wiki: false,
  has_pages: false,
  forks_count: 42,
  archived: false,
  disabled: false,
  open_issues_count: 5,
  license: null,
  allow_forking: true,
  is_template: false,
  web_commit_signoff_required: false,
  topics: ['git', 'intelligence', 'react'],
  visibility: 'public',
  forks: 42,
  open_issues: 5,
  watchers: 350,
  default_branch: 'main',
};

const mockStats: CommitStatistics = {
  totalCommits: 120,
  frequency: {
    commitsPerDay: 1.5,
    commitsPerWeek: 10.5,
    commitsPerMonth: 45.0,
    activeDaysCount: 40,
    timeSpanDays: 80,
    firstCommitDate: '2026-01-01T00:00:00Z',
    lastCommitDate: '2026-03-02T15:30:00Z',
  },
  dayOfWeekDistribution: { 0: 5, 1: 25, 2: 30, 3: 20, 4: 20, 5: 15, 6: 5 },
  hourOfDayDistribution: { 10: 20, 14: 40, 18: 60 },
  changeStats: {
    totalAdditions: 5400,
    totalDeletions: 1200,
    totalChanges: 6600,
    avgAdditionsPerCommit: 45,
    avgDeletionsPerCommit: 10,
    avgChangesPerCommit: 55,
  },
  authors: [{ name: 'Hamza', email: 'hamza@example.com', commitCount: 120, percentage: 100 }],
};

const mockFileAnalysis: FileChurnAnalysis = {
  totalFilesChanged: 45,
  hotspots: [
    { filename: 'src/services/githubApi.ts', totalChanges: 800, churnScore: 92, additions: 600, deletions: 200, commitCount: 25 },
    { filename: 'src/components/DiffViewer.tsx', totalChanges: 500, churnScore: 78, additions: 400, deletions: 100, commitCount: 18 },
    { filename: 'src/types/github.ts', totalChanges: 300, churnScore: 65, additions: 250, deletions: 50, commitCount: 15 },
    { filename: 'backend/src/ai/provider.ts', totalChanges: 200, churnScore: 45, additions: 180, deletions: 20, commitCount: 8 },
    { filename: 'backend/src/ai/contextBuilder.ts', totalChanges: 180, churnScore: 40, additions: 170, deletions: 10, commitCount: 6 },
    { filename: 'README.md', totalChanges: 100, churnScore: 20, additions: 80, deletions: 20, commitCount: 5 },
  ],
  fileExtensions: {
    ts: 25,
    tsx: 15,
    json: 3,
    md: 2,
  },
  directoryDistribution: {
    'src/services': 5,
    'src/components': 15,
    'backend/src': 20,
  },
};

const mockEvolution: RepositoryEvolutionAnalysis = {
  trajectory: {
    pattern: 'ACCELERATING',
    description: 'Commit velocity increased significantly in recent weeks',
    momentumMultiplier: 1.85,
    recentVelocity: 3.2,
    previousVelocity: 1.7,
  },
  periods: [
    { periodIndex: 0, startDate: '2026-01-01', endDate: '2026-01-31', commitCount: 20, intensity: 'LOW', additions: 1000, deletions: 200 },
    { periodIndex: 1, startDate: '2026-02-01', endDate: '2026-02-28', commitCount: 40, intensity: 'MEDIUM', additions: 2000, deletions: 400 },
    { periodIndex: 2, startDate: '2026-03-01', endDate: '2026-03-31', commitCount: 60, intensity: 'HIGH', additions: 2400, deletions: 600 },
  ],
};

const mockDivergence: BranchDivergenceAnalysis = {
  baseRef: 'main',
  headRef: 'feature/ai-workbench',
  status: 'DIVERGED',
  aheadBy: 4,
  behindBy: 2,
  mergeBaseSha: 'abc12347890abcdef',
  mergeBaseMessage: 'Merge pull request #12 from main',
  delta: {
    totalCommits: 4,
    totalFilesChanged: 8,
    totalAdditions: 450,
    totalDeletions: 80,
    commitMessages: [
      'feat: add AI provider abstraction',
      'feat: add Gemini provider implementation',
      'test: add provider test coverage',
      'docs: update TASK and MEMORY for D6-P1',
    ],
    authors: [
      { name: 'Hamza', login: 'h4mcodes', commitCount: 4 },
    ],
  },
};

const mockGraph: CommitRelationshipGraph = {
  totalCommits: 3,
  orderedShas: ['c333333333333333', 'b222222222222222', 'a111111111111111'],
  rootShas: ['a111111111111111'],
  headShas: ['c333333333333333'],
  nodes: {
    'a111111111111111': {
      sha: 'a111111111111111',
      shortSha: 'a111111',
      message: 'feat: initial root commit',
      author: { name: 'Hamza', login: 'h4mcodes', email: null, date: '2026-01-01T00:00:00Z', avatarUrl: null },
      timestamp: '2026-01-01T00:00:00Z',
      parentShas: [],
      childShas: ['b222222222222222'],
      isMerge: false,
      isRoot: true,
      htmlUrl: 'https://github.com/h4mcodes/gitexplore/commit/a111111',
      rawCommit: {} as unknown as GithubApiCommitSummary,
    },
    'b222222222222222': {
      sha: 'b222222222222222',
      shortSha: 'b222222',
      message: 'feat: add core workbench structure',
      author: { name: 'Hamza', login: 'h4mcodes', email: null, date: '2026-01-02T00:00:00Z', avatarUrl: null },
      timestamp: '2026-01-02T00:00:00Z',
      parentShas: ['a111111111111111'],
      childShas: ['c333333333333333'],
      isMerge: false,
      isRoot: false,
      htmlUrl: 'https://github.com/h4mcodes/gitexplore/commit/b222222',
      rawCommit: {} as unknown as GithubApiCommitSummary,
    },
    'c333333333333333': {
      sha: 'c333333333333333',
      shortSha: 'c333333',
      message: 'Merge pull request #1 from branch\n\nFull details of the merge',
      author: { name: 'Hamza', login: 'h4mcodes', email: null, date: '2026-01-03T00:00:00Z', avatarUrl: null },
      timestamp: '2026-01-03T00:00:00Z',
      parentShas: ['b222222222222222', 'd444444444444444'],
      childShas: [],
      isMerge: true,
      isRoot: false,
      htmlUrl: 'https://github.com/h4mcodes/gitexplore/commit/c333333',
      rawCommit: {} as unknown as GithubApiCommitSummary,
    },
  },
};

describe('AI Context Builders (D6-P2)', () => {
  describe('truncateText utility', () => {
    it('returns empty string for null or undefined input', () => {
      expect(truncateText(null, 100)).toBe('');
      expect(truncateText(undefined, 100)).toBe('');
    });

    it('returns original text if length is <= maxLength', () => {
      const text = 'Short diff content';
      expect(truncateText(text, 100)).toBe(text);
      expect(truncateText(text, text.length)).toBe(text);
    });

    it('truncates and appends omission metadata when text exceeds maxLength', () => {
      const text = '1234567890ABCDEFGHIJ';
      const truncated = truncateText(text, 10);
      expect(truncated).toContain('1234567890');
      expect(truncated).toContain('... [Truncated: 10 chars omitted]');
    });
  });

  describe('buildRepositoryOverviewContext', () => {
    it('builds bounded context with minimal repo input (null intelligence)', () => {
      const context = buildRepositoryOverviewContext({
        repo: mockRepo,
      });

      expect(context.repository).toBeDefined();
      const repoData = context.repository as Record<string, unknown>;
      expect(repoData.owner).toBe('h4mcodes');
      expect(repoData.name).toBe('gitexplore');
      expect(repoData.primaryLanguage).toBe('TypeScript');
      expect(repoData.starsCount).toBe(350);
      expect(context.commitStatistics).toBeUndefined();
      expect(context.fileArchitecture).toBeUndefined();
      expect(context.evolutionPattern).toBeUndefined();
    });

    it('builds comprehensive context when all intelligence structures are supplied', () => {
      const context = buildRepositoryOverviewContext({
        repo: mockRepo,
        statistics: mockStats,
        fileAnalysis: mockFileAnalysis,
        evolution: mockEvolution,
      });

      const stats = context.commitStatistics as Record<string, unknown>;
      expect(stats.totalCommitsAnalyzed).toBe(120);
      expect(stats.commitsPerWeek).toBe(10.5);
      expect(stats.totalAdditions).toBe(5400);

      const arch = context.fileArchitecture as Record<string, unknown>;
      expect(arch.totalFilesChanged).toBe(45);
      expect(arch.topHotspotFiles).toBeDefined();
      expect((arch.topHotspotFiles as Array<unknown>).length).toBeLessThanOrEqual(5);

      const evo = context.evolutionPattern as Record<string, unknown>;
      expect(evo.growthTrajectory).toBe('ACCELERATING');
      expect(evo.momentumMultiplier).toBe(1.85);
    });
  });

  describe('buildCommitExplanationContext', () => {
    const mockCommitDetail: GithubApiCommitDetail = {
      sha: 'abcdef1234567890abcdef1234567890abcdef12',
      node_id: 'MDY6Q29tbWl0MTIzNDU2',
      url: 'https://api.github.com/repos/h4mcodes/gitexplore/commits/abcdef123456',
      html_url: 'https://github.com/h4mcodes/gitexplore/commit/abcdef123456',
      commit: {
        author: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-03-02T15:30:00Z',
        },
        committer: {
          name: 'Hamza',
          email: 'hamza@example.com',
          date: '2026-03-02T15:30:00Z',
        },
        message: 'feat(ai): integrate context builder for deterministic intelligence',
        tree: { sha: 'tree123', url: '' },
        url: '',
        comment_count: 0,
      },
      author: {
        login: 'h4mcodes',
        id: 100,
        node_id: 'MDQ6VXNlcjEwMA==',
        avatar_url: 'https://avatars.githubusercontent.com/u/100',
        gravatar_id: '',
        url: '',
        html_url: '',
        type: 'User',
        site_admin: false,
      },
      committer: null,
      parents: [
        { sha: 'parent1234567890', url: '', html_url: '' },
      ],
      stats: {
        total: 125,
        additions: 110,
        deletions: 15,
      },
      files: [
        {
          sha: 'fsha1',
          filename: 'backend/src/ai/contextBuilder.ts',
          status: 'added',
          additions: 100,
          deletions: 0,
          changes: 100,
          blob_url: '',
          raw_url: '',
          contents_url: '',
          patch: '@@ -0,0 +1,100 @@\n+export function buildAIContext() {}',
        },
      ],
    };

    it('builds bounded commit explanation payload with parent SHAs and stats', () => {
      const context = buildCommitExplanationContext({
        commit: mockCommitDetail,
        repositoryCoordinates: { owner: 'h4mcodes', repo: 'gitexplore' },
        parentMessages: ['fix(core): earlier fix on main'],
      });

      const commitInfo = context.commit as Record<string, unknown>;
      expect(commitInfo.sha).toBe(mockCommitDetail.sha);
      expect(commitInfo.shortSha).toBe('abcdef1');
      expect(commitInfo.isMerge).toBe(false);
      expect(commitInfo.parentShas).toEqual(['parent1234567890']);
      expect(commitInfo.parentMessages).toEqual(['fix(core): earlier fix on main']);

      const stats = context.changeStats as Record<string, unknown>;
      expect(stats.totalChanges).toBe(125);
      expect(stats.additions).toBe(110);
      expect(stats.deletions).toBe(15);

      const files = context.changedFiles as Array<Record<string, unknown>>;
      expect(files.length).toBe(1);
      expect(files[0].filename).toBe('backend/src/ai/contextBuilder.ts');
      expect(files[0].patchSnippet).toContain('export function buildAIContext');
    });

    it('bounds large patches to avoid payload overflow', () => {
      const veryLargePatch = 'x'.repeat(5000);
      const commitWithHugePatch: GithubApiCommitDetail = {
        ...mockCommitDetail,
        files: [
          {
            sha: 'fsha1',
            filename: 'hugeFile.ts',
            status: 'modified',
            additions: 500,
            deletions: 500,
            changes: 1000,
            blob_url: '',
            raw_url: '',
            contents_url: '',
            patch: veryLargePatch,
          },
        ],
      };

      const context = buildCommitExplanationContext({
        commit: commitWithHugePatch,
      });

      const files = context.changedFiles as Array<Record<string, unknown>>;
      expect(files[0].patchSnippet).toBeDefined();
      const snippet = files[0].patchSnippet as string;
      expect(snippet.length).toBeLessThan(2000);
      expect(snippet).toContain('[Truncated:');
    });
  });

  describe('buildDiffReviewContext', () => {
    it('aggregates file metrics and provides bounded patch reviews', () => {
      const diffFiles: GithubApiCommitFile[] = [
        {
          sha: 'f1',
          filename: 'src/App.tsx',
          status: 'modified',
          additions: 30,
          deletions: 10,
          changes: 40,
          blob_url: '',
          raw_url: '',
          contents_url: '',
          patch: '@@ -1,5 +1,25 @@\n+ import { AIWorkbench } from "./components/AIWorkbench";',
        },
        {
          sha: 'f2',
          filename: 'src/components/AIWorkbench.tsx',
          status: 'added',
          additions: 120,
          deletions: 0,
          changes: 120,
          blob_url: '',
          raw_url: '',
          contents_url: '',
          patch: '@@ -0,0 +1,120 @@\n+export function AIWorkbench() { return <div>AI</div>; }',
        },
      ];

      const context = buildDiffReviewContext({
        title: 'Review Branch PR #15',
        files: diffFiles,
        baseRef: 'main',
        headRef: 'feature/ai-workbench',
      });

      const target = context.reviewTarget as Record<string, unknown>;
      expect(target.title).toBe('Review Branch PR #15');
      expect(target.baseRef).toBe('main');
      expect(target.headRef).toBe('feature/ai-workbench');

      const metrics = context.aggregateMetrics as Record<string, unknown>;
      expect(metrics.filesChangedCount).toBe(2);
      expect(metrics.totalAdditions).toBe(150);
      expect(metrics.totalDeletions).toBe(10);
      expect(metrics.totalNetChanges).toBe(140);

      const files = context.files as Array<Record<string, unknown>>;
      expect(files.length).toBe(2);
      expect(files[0].filename).toBe('src/App.tsx');
      expect(files[1].filename).toBe('src/components/AIWorkbench.tsx');
    });
  });

  describe('buildBranchAnalysisContext', () => {
    it('formats branch divergence delta and author contribution summary', () => {
      const comparison: GithubApiComparison = {
        url: '',
        html_url: '',
        permalink_url: '',
        diff_url: '',
        patch_url: '',
        base_commit: {} as unknown as GithubApiCommitDetail,
        merge_base_commit: {} as unknown as GithubApiCommitDetail,
        status: 'diverged',
        ahead_by: 4,
        behind_by: 2,
        total_commits: 4,
        commits: [],
        files: [
          {
            sha: 'cf1',
            filename: 'src/AI.tsx',
            status: 'added',
            additions: 50,
            deletions: 0,
            changes: 50,
            blob_url: '',
            raw_url: '',
            contents_url: '',
          },
        ],
      };

      const context = buildBranchAnalysisContext({
        divergence: mockDivergence,
        comparison,
      });

      const comparisonInfo = context.branchComparison as Record<string, unknown>;
      expect(comparisonInfo.baseRef).toBe('main');
      expect(comparisonInfo.headRef).toBe('feature/ai-workbench');
      expect(comparisonInfo.divergenceStatus).toBe('DIVERGED');
      expect(comparisonInfo.aheadBy).toBe(4);
      expect(comparisonInfo.behindBy).toBe(2);

      const delta = context.deltaSummary as Record<string, unknown>;
      expect(delta.totalCommits).toBe(4);
      expect(delta.authors).toEqual([{ name: 'Hamza', login: 'h4mcodes', commitCount: 4 }]);

      const topFiles = context.topModifiedFiles as Array<Record<string, unknown>>;
      expect(topFiles).toBeDefined();
      expect(topFiles[0].filename).toBe('src/AI.tsx');
    });
  });

  describe('buildRepositoryHealthContext', () => {
    it('constructs health context with trajectory, activity, and code stability metrics', () => {
      const context = buildRepositoryHealthContext({
        repo: mockRepo,
        statistics: mockStats,
        evolution: mockEvolution,
        fileAnalysis: mockFileAnalysis,
      });

      const repoInfo = context.repository as Record<string, unknown>;
      expect(repoInfo.name).toBe('gitexplore');
      expect(repoInfo.starsCount).toBe(350);
      expect(typeof repoInfo.daysSinceLastPush).toBe('number');

      const activity = context.activityMetrics as Record<string, unknown>;
      expect(activity.totalCommits).toBe(120);
      expect(activity.commitsPerWeek).toBe(10.5);

      const evo = context.evolutionHealth as Record<string, unknown>;
      expect(evo.growthTrajectory).toBe('ACCELERATING');
      expect(evo.recentVelocity).toBe(3.2);

      const stability = context.codeStability as Record<string, unknown>;
      expect(stability.totalFilesChanged).toBe(45);
      expect(stability.criticalHotspotsCount).toBe(3); // scores 92, 78, 65 are > 50
    });
  });

  describe('buildRepositoryQAContext', () => {
    it('packages user question with repository facts and focused evidence', () => {
      const context = buildRepositoryQAContext({
        question: 'Which file has the highest churn rate and why?',
        repo: mockRepo,
        analysis: {
          statistics: mockStats,
          fileAnalysis: mockFileAnalysis,
          evolution: mockEvolution,
        },
        focusedContext: {
          queriedHotspot: 'src/services/githubApi.ts',
        },
      });

      expect(context.question).toBe('Which file has the highest churn rate and why?');
      const repo = context.repository as Record<string, unknown>;
      expect(repo.name).toBe('gitexplore');

      const intel = context.intelligenceSummary as Record<string, unknown>;
      expect(intel.totalCommits).toBe(120);
      expect(intel.hotspotFilesCount).toBe(6);

      const focused = context.focusedEvidence as Record<string, unknown>;
      expect(focused.queriedHotspot).toBe('src/services/githubApi.ts');
    });
  });

  describe('buildRepositoryInvestigationContext (D8-P1)', () => {
    it('combines multiple intelligence sources into a coherent investigation context', () => {
      const context = buildRepositoryInvestigationContext({
        repo: mockRepo,
        query: 'What architectural shifts happened in the codebase recently?',
        graph: mockGraph,
        statistics: mockStats,
        fileAnalysis: mockFileAnalysis,
        evolution: mockEvolution,
        divergence: mockDivergence,
        focusedFiles: ['src/services/githubApi.ts', 'src/components/DiffViewer.tsx'],
        focusedAuthors: ['Hamza'],
        customEvidence: { issueRef: '#42' },
      });

      // 1. Target metadata
      const target = context.investigationTarget as Record<string, unknown>;
      expect(target.name).toBe('gitexplore');
      expect(target.fullName).toBe('h4mcodes/gitexplore');
      expect(target.primaryLanguage).toBe('TypeScript');
      expect(target.starsCount).toBe(350);

      // 2. Query
      expect(context.investigationQuery).toBe('What architectural shifts happened in the codebase recently?');

      // 3. Graph intelligence
      const graphInfo = context.graphIntelligence as Record<string, unknown>;
      expect(graphInfo.totalCommitsInGraph).toBe(3);
      expect(graphInfo.rootCommitsCount).toBe(1);
      expect(graphInfo.headCommitsCount).toBe(1);
      expect(graphInfo.mergeCommitsCount).toBe(1);

      // 4. Recent commits extracted from graph
      const commits = context.recentCommits as Array<Record<string, unknown>>;
      expect(commits).toHaveLength(3);
      expect(commits[0].sha).toBe('c333333');
      expect(commits[0].isMerge).toBe(true);

      // 5. Commit statistics
      const stats = context.commitStatistics as Record<string, unknown>;
      expect(stats.totalCommits).toBe(120);
      const cadence = stats.cadence as Record<string, unknown>;
      expect(cadence.commitsPerWeek).toBe(10.5);

      // 6. File architecture & hotspots
      const files = context.fileArchitectureAndHotspots as Record<string, unknown>;
      expect(files.totalFilesChanged).toBe(45);
      const hotspots = files.criticalHotspots as Array<Record<string, unknown>>;
      expect(hotspots.length).toBeGreaterThan(0);
      expect(hotspots[0].filename).toBe('src/services/githubApi.ts');

      // 7. Evolution & trajectory
      const evo = context.evolutionTrajectory as Record<string, unknown>;
      expect(evo.growthTrajectory).toBe('ACCELERATING');
      expect(evo.momentumMultiplier).toBe(1.85);

      // 8. Branch divergence
      const div = context.branchDivergence as Record<string, unknown>;
      expect(div.status).toBe('DIVERGED');
      expect(div.aheadBy).toBe(4);
      expect(div.behindBy).toBe(2);

      // 9. Investigation scope
      const scope = context.investigationScope as Record<string, unknown>;
      expect(scope.targetedFiles).toEqual(['src/services/githubApi.ts', 'src/components/DiffViewer.tsx']);
      expect(scope.targetedAuthors).toEqual(['Hamza']);

      // 10. Custom evidence
      expect(context.customEvidence).toEqual({ issueRef: '#42' });
    });

    it('assembles context from unified RepositoryAnalysis input gracefully', () => {
      const context = buildRepositoryInvestigationContext({
        repo: mockRepo,
        analysis: {
          graph: mockGraph,
          statistics: mockStats,
          fileAnalysis: mockFileAnalysis,
          evolution: mockEvolution,
          divergence: mockDivergence,
        },
      });

      expect(context.investigationTarget).toBeDefined();
      expect(context.graphIntelligence).toBeDefined();
      expect(context.commitStatistics).toBeDefined();
      expect(context.fileArchitectureAndHotspots).toBeDefined();
      expect(context.evolutionTrajectory).toBeDefined();
      expect(context.branchDivergence).toBeDefined();
    });

    it('enforces token safety boundaries by truncating long messages and bounding arrays', () => {
      // Create 30 commits to test max limit capping at 15
      const longCommits = Array.from({ length: 30 }, (_, i) => ({
        sha: `abcdef${i}1234567890`,
        message: `Commit ${i}: ${'x'.repeat(300)}`,
        authorName: `Dev ${i}`,
        date: '2026-03-01T00:00:00Z',
      }));

      // Create long query (> 500 chars)
      const longQuery = 'Explain '.repeat(100);

      const context = buildRepositoryInvestigationContext({
        repo: mockRepo,
        query: longQuery,
        recentCommits: longCommits,
      });

      const commits = context.recentCommits as Array<Record<string, unknown>>;
      expect(commits).toHaveLength(15); // Capped at MAX_INVESTIGATION_COMMITS
      expect((commits[0].message as string).length).toBeLessThanOrEqual(210); // Truncated with ellipsis
      expect(commits[0].message as string).toContain('[Truncated:');

      expect((context.investigationQuery as string).length).toBeLessThanOrEqual(560);
      expect(context.investigationQuery as string).toContain('[Truncated:');
    });

    it('estimatePayloadTokens calculates heuristic token budget accurately', () => {
      const samplePayload = {
        name: 'test',
        items: [1, 2, 3],
        description: 'short string',
      };
      const tokenEstimate = estimatePayloadTokens(samplePayload);
      const jsonLength = JSON.stringify(samplePayload).length;
      expect(tokenEstimate).toBe(Math.ceil(jsonLength / 4));
      expect(tokenEstimate).toBeGreaterThan(0);
    });

    it('buildRepositoryQAContext delegates to investigation context engine when rich investigation is provided', () => {
      const context = buildRepositoryQAContext({
        question: 'What is the commit velocity?',
        repo: mockRepo,
        investigation: {
          repo: mockRepo,
          statistics: mockStats,
          graph: mockGraph,
        },
      });

      expect(context.question).toBe('What is the commit velocity?');
      expect(context.investigationTarget).toBeDefined();
      expect(context.graphIntelligence).toBeDefined();
      expect(context.commitStatistics).toBeDefined();
    });
  });

  describe('buildAIContext (Universal Dispatcher)', () => {
    it('dispatches REPOSITORY_OVERVIEW correctly', () => {
      const payload = buildAIContext('REPOSITORY_OVERVIEW', {
        repo: mockRepo,
      });
      expect(payload.repository).toBeDefined();
    });

    it('dispatches CUSTOM analysis type returning given input', () => {
      const customData = { customKey: 'customValue', arbitraryNumber: 42 };
      const payload = buildAIContext('CUSTOM', customData);
      expect(payload).toEqual(customData);
    });

    it('throws error for unsupported analysis type', () => {
      expect(() => {
        // @ts-expect-error Testing runtime safeguard for unexpected type
        buildAIContext('INVALID_TYPE', {});
      }).toThrow('Unsupported analysis type for context building: INVALID_TYPE');
    });
  });
});
