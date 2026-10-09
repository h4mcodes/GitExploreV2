import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { githubClient } from '../../src/github/client.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import { setAIProvider, resetAIProvider } from '../../src/ai/provider.js';
import { MockAIProvider } from '../../src/ai/providers/mockProvider.js';
import type { User, SavedRepository, Investigation, Note, Bookmark, Tag } from '@prisma/client';

// Mock GitHub Client
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

// Mock Prisma
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    savedRepository: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    investigation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    note: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bookmark: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    repositoryTag: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    aIAnalysis: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('PRD Section 9: End-to-End User Flows Validation (D10-P5)', () => {
  const app = createApp();
  let mockAI: MockAIProvider;

  const mockUser: User = {
    id: 'user-uuid-101',
    email: 'engineer@gitexplore.io',
    username: 'octo-dev',
    passwordHash: 'scrypt:mock-hash',
    role: 'USER',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const authToken = generateToken({
    userId: mockUser.id,
    username: mockUser.username,
    email: mockUser.email,
  });

  const mockSavedRepo: SavedRepository = {
    id: 'repo-uuid-501',
    userId: mockUser.id,
    githubRepoId: 10001,
    owner: 'torvalds',
    name: 'linux',
    fullName: 'torvalds/linux',
    description: 'Linux kernel source tree',
    language: 'C',
    stars: 180000,
    forks: 54000,
    openIssues: 1200,
    isArchived: false,
    isPrivate: false,
    defaultBranch: 'master',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAI = new MockAIProvider({ model: 'gemini-1.5-flash' });
    mockAI.setMockResponse((req) => {
      const type = String(req.type).toUpperCase();
      if (type === 'REPOSITORY_OVERVIEW') {
        return JSON.stringify({
          summary: 'GitExplore Linux kernel repository overview.',
          purpose: 'Operating system kernel core development.',
          primaryStack: ['C', 'Assembly'],
          techStack: ['C', 'Assembly', 'Makefile'],
          activityLevel: 'HIGH',
          maintenanceAssessment: 'Extremely high commit cadence and code review standards.',
          architectureObservations: ['Monolithic kernel design', 'Subsystem maintainer model'],
          notablePatterns: ['Careful memory management', 'Lockless algorithms'],
          hotspotAnalysis: {
            criticalFiles: ['kernel/sched/core.c', 'net/ipv4/tcp_input.c'],
            observations: 'Core scheduler and TCP networking see continuous churn.',
          },
          growthTrajectory: 'Steady and active open source maintenance.',
          keyTakeaways: ['High reliability', 'Rigorous upstream reviews'],
        });
      }

      if (type === 'COMMIT_EXPLANATION') {
        return JSON.stringify({
          intent: 'PERFORMANCE',
          summary: 'Optimized spinlock contention in CPU scheduler runqueue.',
          motivation: 'High core count servers suffered from lock bouncing under heavy workloads.',
          technicalImpact: 'Reduces lock wait latency by 18% on NUMA architectures.',
          complexity: 'MEDIUM',
          changesPerFile: [
            {
              filename: 'kernel/sched/core.c',
              summary: 'Switched spin_lock to raw_spin_lock on rq',
              riskLevel: 'LOW',
            },
          ],
          modifiedComponents: [
            {
              filename: 'kernel/sched/core.c',
              summary: 'Switched spin_lock to raw_spin_lock on rq',
              riskLevel: 'LOW',
            },
          ],
          potentialRisks: ['Requires careful nested lock order verification'],
          isBreakingChange: false,
          keyChanges: ['Atomic runqueue locking updated', 'Lockstat counters preserved'],
        });
      }

      if (type === 'DIFF_REVIEW') {
        return JSON.stringify({
          overallAssessment: 'APPROVED',
          summary: 'Scheduler locking patch is clean and adheres to kernel coding guidelines.',
          netChangesSummary: '+12 -4 across 1 file',
          fileReviews: [
            {
              filename: 'kernel/sched/core.c',
              status: 'modified',
              feedback: 'Lock conversion is correct.',
              issuesFound: [],
              observations: [
                {
                  message: 'Clean lock conversion with proper comments.',
                  severity: 'INFO',
                  category: 'CODE_QUALITY',
                },
              ],
            },
          ],
          riskFactors: [],
          recommendations: ['Verify with preempt-rt test suite'],
          keyObservations: [],
          supportingEvidence: ['Diff patch cleanly isolates lock changes'],
        });
      }

      if (type === 'BRANCH_ANALYSIS') {
        return JSON.stringify({
          summary: 'Feature branch bpf-next is ahead of master by 3 commits.',
          divergenceSummary: 'Head branch bpf-next introduces eBPF bytecode verifier bounds checking.',
          syncStatus: 'AHEAD',
          mergeReadiness: 'READY',
          mergeRisk: 'LOW',
          keyContributions: ['eBPF verifier bounds checks', 'kselftest coverage'],
          riskFactors: ['Bounds checking edge cases on 64-bit integer overflows'],
          recommendations: ['Fast-forward merge or rebase cleanly onto master'],
        });
      }

      return JSON.stringify({ summary: `Analysis response for ${req.type}` });
    });

    setAIProvider(mockAI);

    // Default mock behavior for cache & db lookups
    vi.mocked(prisma.aIAnalysis.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.aIAnalysis.create).mockResolvedValue({ id: 'analysis-1' } as any);
    vi.mocked(prisma.savedRepository.findUnique).mockResolvedValue(mockSavedRepo);
    vi.mocked(prisma.savedRepository.findFirst).mockResolvedValue(mockSavedRepo);
  });

  afterEach(() => {
    resetAIProvider();
  });

  // =========================================================================
  // 9.1 New User Flow
  // Search GitHub username → Profile page → Select repo → Intelligence & AI overview → Branches/commits → AI commit & diff review
  // =========================================================================
  describe('9.1 New User Flow: Search → Profile → Repos → Intelligence → AI Overview & Explanations', () => {
    it('successfully executes the entire new user exploration journey', async () => {
      // Step 1: User searches GitHub profile for "torvalds"
      vi.mocked(githubClient.getUser).mockResolvedValueOnce({
        login: 'torvalds',
        id: 1024025,
        avatar_url: 'https://avatars.githubusercontent.com/u/1024025?v=4',
        name: 'Linus Torvalds',
        bio: 'Creator of Linux and Git',
        company: 'Linux Foundation',
        location: 'Portland, OR',
        public_repos: 12,
        public_gists: 0,
        followers: 240000,
        following: 0,
        created_at: '2011-09-03T15:26:22Z',
        updated_at: '2026-01-01T00:00:00Z',
      } as any);

      const userRes = await request(app).get('/api/github/users/torvalds');
      expect(userRes.status).toBe(200);
      expect(userRes.body.login).toBe('torvalds');
      expect(userRes.body.public_repos).toBe(12);

      // Step 2: User profile lists public repositories
      vi.mocked(githubClient.getUserRepos).mockResolvedValueOnce([
        {
          id: 10001,
          name: 'linux',
          full_name: 'torvalds/linux',
          description: 'Linux kernel source tree',
          html_url: 'https://github.com/torvalds/linux',
          stargazers_count: 180000,
          forks_count: 54000,
          language: 'C',
          default_branch: 'master',
        },
      ] as any);

      const reposRes = await request(app).get('/api/github/users/torvalds/repos');
      expect(reposRes.status).toBe(200);
      expect(Array.isArray(reposRes.body)).toBe(true);
      expect(reposRes.body[0].name).toBe('linux');

      // Step 3: User triggers full deterministic intelligence analysis on repository
      vi.mocked(githubClient.getRepo).mockResolvedValue({
        id: 10001,
        name: 'linux',
        full_name: 'torvalds/linux',
        owner: { login: 'torvalds' },
        description: 'Linux kernel source tree',
        stargazers_count: 180000,
        forks_count: 54000,
        language: 'C',
        default_branch: 'master',
      } as any);

      vi.mocked(githubClient.getBranches).mockResolvedValue([
        { name: 'master', commit: { sha: 'c001' } },
        { name: 'staging', commit: { sha: 'c002' } },
      ] as any);

      vi.mocked(githubClient.getCommits).mockResolvedValue([
        {
          sha: 'c001',
          commit: {
            message: 'sched: optimize runqueue lock contention',
            author: { name: 'Linus Torvalds', date: '2026-03-01T00:00:00Z' },
          },
          parents: [{ sha: 'c000' }],
        },
        {
          sha: 'c000',
          commit: {
            message: 'init: kernel boot sequence',
            author: { name: 'Linus Torvalds', date: '2026-02-28T00:00:00Z' },
          },
          parents: [],
        },
      ] as any);

      vi.mocked(githubClient.getCommit).mockResolvedValue({
        sha: 'c001',
        commit: {
          message: 'sched: optimize runqueue lock contention',
          author: { name: 'Linus Torvalds', date: '2026-03-01T00:00:00Z' },
        },
        parents: [{ sha: 'c000' }],
        stats: { total: 16, additions: 12, deletions: 4 },
        files: [
          {
            filename: 'kernel/sched/core.c',
            status: 'modified',
            additions: 12,
            deletions: 4,
            patch: '@@ -10,4 +10,12 @@',
          },
        ],
      } as any);

      const analyzeRes = await request(app).post('/api/repositories/torvalds/linux/analyze');
      expect(analyzeRes.status).toBe(200);
      expect(analyzeRes.body.owner).toBe('torvalds');
      expect(analyzeRes.body.repo).toBe('linux');
      expect(analyzeRes.body.defaultBranch).toBe('master');
      expect(analyzeRes.body.statistics.totalCommits).toBe(2);
      expect(analyzeRes.body.graph.orderedShas.length).toBe(2);

      // Verify cached repository analysis endpoint reads the result
      const cachedAnalysisRes = await request(app).get('/api/repositories/torvalds/linux/analysis');
      expect(cachedAnalysisRes.status).toBe(200);
      expect(cachedAnalysisRes.body.owner).toBe('torvalds');
      expect(cachedAnalysisRes.body.repo).toBe('linux');

      // Step 4: User requests AI Repository Overview
      const overviewRes = await request(app)
        .post('/api/ai/repository-overview')
        .send({
          repo: {
            owner: 'torvalds',
            name: 'linux',
            description: 'Linux kernel source tree',
            stars: 180000,
            forks: 54000,
            primaryLanguage: 'C',
            languages: { C: 95, Assembly: 5 },
            topics: ['kernel', 'operating-system'],
            defaultBranch: 'master',
          },
        });

      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.data).toBeDefined();
      expect(overviewRes.body.data.summary).toBeDefined();
      expect(overviewRes.body.data.activityLevel).toBe('HIGH');

      // Step 5: User browses branches and commits
      const branchesRes = await request(app).get('/api/github/repos/torvalds/linux/branches');
      expect(branchesRes.status).toBe(200);
      expect(branchesRes.body.length).toBe(2);

      const commitsRes = await request(app).get('/api/github/repos/torvalds/linux/commits?branch=master');
      expect(commitsRes.status).toBe(200);
      expect(commitsRes.body[0].sha).toBe('c001');

      // Step 6: User requests AI Commit Explanation
      const explainRes = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          commit: {
            sha: 'c001',
            commit: {
              message: 'sched: optimize runqueue lock contention',
              author: { name: 'Linus Torvalds', date: '2026-03-01T00:00:00Z' },
            },
            files: [
              {
                filename: 'kernel/sched/core.c',
                status: 'modified',
                additions: 12,
                deletions: 4,
                patch: '@@ -10,4 +10,12 @@\n-spin_lock(&rq->lock);\n+raw_spin_lock(&rq->lock);',
              },
            ],
          },
        });

      expect(explainRes.status).toBe(200);
      expect(explainRes.body.data.summary).toBeDefined();
      expect(explainRes.body.data.intent).toBe('PERFORMANCE');

      // Step 7: User requests AI Diff Review
      const diffRes = await request(app)
        .post('/api/ai/diff-review')
        .send({
          files: [
            {
              filename: 'kernel/sched/core.c',
              status: 'modified',
              additions: 12,
              deletions: 4,
              patch: '@@ -10,4 +10,12 @@\n-spin_lock(&rq->lock);\n+raw_spin_lock(&rq->lock);',
            },
          ],
        });

      expect(diffRes.status).toBe(200);
      expect(diffRes.body.data.summary).toBeDefined();
      expect(diffRes.body.data.overallAssessment).toBe('APPROVED');
    });
  });

  // =========================================================================
  // 9.2 Investigation Flow
  // Repo page → Branch select → Commit history → Commit detail + diff → AI explain & diff review → Save investigation
  // =========================================================================
  describe('9.2 Investigation Flow: Commit Inspection → Deep Diff Review → AI Explanations → Save Investigation & Notes', () => {
    it('executes the full investigation lifecycle with persistence', async () => {
      // Step 1: User drills into commit details with patch diff
      const commitFixture = {
        sha: 'a1b2c3d4e5f6',
        commit: {
          message: 'net: tcp: fix window scale negotiation',
          author: { name: 'Network Team', date: '2026-03-02T10:00:00Z' },
        },
        parents: [{ sha: 'parent-sha' }],
        stats: { total: 15, additions: 10, deletions: 5 },
        files: [
          {
            filename: 'net/ipv4/tcp_input.c',
            status: 'modified',
            additions: 10,
            deletions: 5,
            patch: '@@ -50,5 +50,10 @@ void tcp_rcv() { ... }',
          },
        ],
      };

      vi.mocked(githubClient.getCommit).mockResolvedValueOnce(commitFixture as any);

      const commitDetailRes = await request(app).get('/api/github/repos/torvalds/linux/commits/a1b2c3d4e5f6');
      expect(commitDetailRes.status).toBe(200);
      expect(commitDetailRes.body.sha).toBe('a1b2c3d4e5f6');
      expect(commitDetailRes.body.files.length).toBe(1);

      // Step 2: AI Commit Explanation
      const explainRes = await request(app)
        .post('/api/ai/commit-explanation')
        .send({
          commit: commitFixture,
        });
      expect(explainRes.status).toBe(200);
      expect(explainRes.body.data.summary).toBeDefined();
      expect(explainRes.body.data.intent).toBe('PERFORMANCE');

      // Step 3: Save Investigation into Workspace
      const createdInvestigation: Investigation = {
        id: 'inv-uuid-301',
        userId: mockUser.id,
        repositoryId: mockSavedRepo.id,
        title: 'TCP Window Scale Bug Investigation',
        description: 'Analyzing latency regressions caused by scale negotiation.',
        context: { commitSha: 'a1b2c3d4e5f6', branch: 'master' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findFirst).mockResolvedValue(mockSavedRepo);
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValue(mockSavedRepo);
      vi.mocked(prisma.investigation.create).mockResolvedValueOnce(createdInvestigation);

      const createInvRes = await request(app)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repositoryId: mockSavedRepo.id,
          title: 'TCP Window Scale Bug Investigation',
          description: 'Analyzing latency regressions caused by scale negotiation.',
          context: { commitSha: 'a1b2c3d4e5f6', branch: 'master' },
        });

      expect(createInvRes.status).toBe(201);
      expect(createInvRes.body.id).toBe('inv-uuid-301');
      expect(createInvRes.body.title).toBe('TCP Window Scale Bug Investigation');

      // Step 4: Attach AI Analysis Record to Investigation
      const attachedAnalysisRecord = {
        id: 'analysis-rec-1',
        userId: mockUser.id,
        investigationId: 'inv-uuid-301',
        type: 'commit_explanation',
        modelId: 'gemini-1.5-flash',
        data: explainRes.body.data,
        createdAt: new Date(),
      };
      vi.mocked(prisma.investigation.findUnique).mockResolvedValue(createdInvestigation as any);
      vi.mocked(prisma.investigation.findFirst).mockResolvedValue(createdInvestigation as any);
      vi.mocked(prisma.investigation.update).mockResolvedValue(createdInvestigation as any);
      vi.mocked(prisma.aIAnalysis.create).mockResolvedValueOnce(attachedAnalysisRecord as any);

      const attachRes = await request(app)
        .post('/api/investigations/inv-uuid-301/analyses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'commit_explanation',
          data: explainRes.body.data,
          title: 'TCP Window Scale AI Assessment',
          modelId: 'gemini-1.5-flash',
          provider: 'google-gemini',
        });

      expect(attachRes.status).toBe(200);
      expect(attachRes.body.id).toBe('inv-uuid-301');

      // Step 5: Save Note attached to Investigation & Commit
      const mockNote: Note = {
        id: 'note-uuid-401',
        userId: mockUser.id,
        repositoryId: mockSavedRepo.id,
        investigationId: 'inv-uuid-301',
        targetType: 'commit',
        targetRef: 'a1b2c3d4e5f6',
        content: 'Patch resolves window scale deadlock on high BDP links.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findFirst).mockResolvedValueOnce(createdInvestigation);
      vi.mocked(prisma.note.create).mockResolvedValueOnce(mockNote);

      const noteRes = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Patch resolves window scale deadlock on high BDP links.',
          targetType: 'commit',
          targetRef: 'a1b2c3d4e5f6',
          repositoryId: mockSavedRepo.id,
          investigationId: 'inv-uuid-301',
        });

      expect(noteRes.status).toBe(201);
      expect(noteRes.body.id).toBe('note-uuid-401');
      expect(noteRes.body.targetRef).toBe('a1b2c3d4e5f6');

      // Step 6: Bookmark the commit
      const mockBookmark: Bookmark = {
        id: 'bm-uuid-601',
        userId: mockUser.id,
        repositoryId: mockSavedRepo.id,
        targetType: 'COMMIT',
        targetRef: 'a1b2c3d4e5f6',
        label: 'TCP Window Scale Commit',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.bookmark.create).mockResolvedValueOnce(mockBookmark);

      const bmRes = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repositoryId: mockSavedRepo.id,
          targetType: 'COMMIT',
          targetRef: 'a1b2c3d4e5f6',
          label: 'TCP Window Scale Commit',
        });

      expect(bmRes.status).toBe(201);
      expect(bmRes.body.id).toBe('bm-uuid-601');
      expect(bmRes.body.label).toBe('TCP Window Scale Commit');
    });
  });

  // =========================================================================
  // 9.3 Workspace Flow
  // Auth login/register → Workspace overview → Saved repos → Investigations → Notes & Tags
  // =========================================================================
  describe('9.3 Workspace Flow: Multi-Tenant Authentication → Workspace Dashboard → Saved Entities & Tagging', () => {
    it('handles user authentication, workspace summary, and multi-tenant tagging', async () => {
      // Step 1: Workspace Overview
      vi.mocked(prisma.savedRepository.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.investigation.count).mockResolvedValueOnce(3);
      vi.mocked(prisma.note.count).mockResolvedValueOnce(8);
      vi.mocked(prisma.bookmark.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce([mockSavedRepo]);
      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce([]);

      const wsOverviewRes = await request(app)
        .get('/api/workspace')
        .set('Authorization', `Bearer ${authToken}`);

      expect(wsOverviewRes.status).toBe(200);
      expect(wsOverviewRes.body.metrics.savedReposCount).toBe(1);
      expect(wsOverviewRes.body.metrics.investigationsCount).toBe(3);
      expect(wsOverviewRes.body.metrics.notesCount).toBe(8);
      expect(wsOverviewRes.body.metrics.bookmarksCount).toBe(2);

      // Step 2: Save a Repository to Workspace
      vi.mocked(prisma.savedRepository.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.savedRepository.create).mockResolvedValueOnce(mockSavedRepo);

      const saveRepoRes = await request(app)
        .post('/api/workspace/repositories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          owner: 'torvalds',
          name: 'linux',
          fullName: 'torvalds/linux',
          description: 'Linux kernel source tree',
          language: 'C',
          stars: 180000,
          forks: 54000,
          defaultBranch: 'master',
        });

      expect(saveRepoRes.status).toBe(201);
      expect(saveRepoRes.body.fullName).toBe('torvalds/linux');

      // Step 3: Create Tag and Assign to Repository
      const mockTag: Tag = {
        id: 'tag-uuid-701',
        userId: mockUser.id,
        name: 'kernel-core',
        color: '#10b981',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.tag.create).mockResolvedValueOnce(mockTag);

      const createTagRes = await request(app)
        .post('/api/workspace/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'kernel-core',
          color: '#10b981',
        });

      expect(createTagRes.status).toBe(201);
      expect(createTagRes.body.name).toBe('kernel-core');

      // Step 4: Assign Tag to Saved Repository
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValue(mockSavedRepo);
      vi.mocked(prisma.tag.findUnique).mockResolvedValue(mockTag);
      vi.mocked(prisma.repositoryTag.upsert).mockResolvedValueOnce({
        savedRepositoryId: mockSavedRepo.id,
        tagId: mockTag.id,
        tag: mockTag,
        createdAt: new Date(),
      } as any);

      const assignTagRes = await request(app)
        .post(`/api/workspace/repositories/${mockSavedRepo.id}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tagId: mockTag.id,
        });

      expect(assignTagRes.status).toBe(200);
      expect(assignTagRes.body.tagId).toBe(mockTag.id);

      // Step 5: List Saved Repositories with Tag associations
      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce([
        {
          ...mockSavedRepo,
          repositoryTags: [{ tag: mockTag }],
        } as any,
      ]);

      const listReposRes = await request(app)
        .get('/api/workspace/repositories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listReposRes.status).toBe(200);
      expect(listReposRes.body.length).toBe(1);
      expect(listReposRes.body[0].repositoryTags[0].tag.name).toBe('kernel-core');

      // Step 6: Multi-Tenant Isolation: Request without token is rejected
      const unauthRes = await request(app).get('/api/workspace');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error).toContain('Authentication');
    });
  });

  // =========================================================================
  // 9.4 Branch Comparison Flow
  // Repo page → Compare base and head → View divergence metrics → AI branch analysis → Save comparison
  // =========================================================================
  describe('9.4 Branch Comparison Flow: Branch Diff → Divergence Metrics → AI Branch Analysis → Save Comparison', () => {
    it('executes branch divergence analysis and AI comparison recommendations', async () => {
      // Step 1: Compare branches via GitHub proxy
      vi.mocked(githubClient.compareCommits).mockResolvedValueOnce({
        status: 'ahead',
        ahead_by: 3,
        behind_by: 0,
        total_commits: 3,
        commits: [
          {
            sha: 'commit-feat-1',
            commit: { message: 'feat: add eBPF bytecode verifier bounds checking', author: { name: 'Kernel Dev' } },
          },
          {
            sha: 'commit-feat-2',
            commit: { message: 'fix: handle NULL pointer in verifier state copy', author: { name: 'Kernel Dev' } },
          },
          {
            sha: 'commit-feat-3',
            commit: { message: 'test: add kselftest for verifier bounds', author: { name: 'Kernel Dev' } },
          },
        ],
        files: [
          {
            filename: 'kernel/bpf/verifier.c',
            status: 'modified',
            additions: 120,
            deletions: 15,
            patch: '@@ -100,6 +100,20 @@ ...',
          },
          {
            filename: 'tools/testing/selftests/bpf/test_verifier.c',
            status: 'modified',
            additions: 85,
            deletions: 0,
            patch: '@@ -50,6 +50,15 @@ ...',
          },
        ],
      } as any);

      const compareRes = await request(app).get('/api/github/repos/torvalds/linux/compare/master...bpf-next');
      expect(compareRes.status).toBe(200);
      expect(compareRes.body.status).toBe('ahead');
      expect(compareRes.body.ahead_by).toBe(3);
      expect(compareRes.body.files.length).toBe(2);

      // Step 2: Request AI Branch Analysis with prebuilt context
      const branchAiRes = await request(app)
        .post('/api/ai/branch-analysis')
        .send({
          context: {
            branchComparison: {
              baseRef: 'master',
              headRef: 'bpf-next',
              aheadBy: 3,
              behindBy: 0,
            },
          },
        });

      expect(branchAiRes.status).toBe(200);
      expect(branchAiRes.body.data.summary).toBeDefined();
      expect(branchAiRes.body.data.syncStatus).toBe('AHEAD');
      expect(branchAiRes.body.data.mergeRisk).toBe('LOW');
      expect(branchAiRes.body.data.recommendations).toBeDefined();

      // Step 3: Save Branch Comparison as Workspace Investigation
      const comparisonInvestigation: Investigation = {
        id: 'inv-uuid-801',
        userId: mockUser.id,
        repositoryId: mockSavedRepo.id,
        title: 'master vs bpf-next Divergence Review',
        description: 'Analyzing eBPF verifier updates prior to upstream merge.',
        context: {
          base: 'master',
          head: 'bpf-next',
          aheadBy: 3,
          behindBy: 0,
          risk: branchAiRes.body.data.mergeRisk,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findFirst).mockResolvedValue(mockSavedRepo);
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValue(mockSavedRepo);
      vi.mocked(prisma.investigation.create).mockResolvedValueOnce(comparisonInvestigation);

      const saveComparisonRes = await request(app)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          repositoryId: mockSavedRepo.id,
          title: 'master vs bpf-next Divergence Review',
          description: 'Analyzing eBPF verifier updates prior to upstream merge.',
          context: {
            base: 'master',
            head: 'bpf-next',
            aheadBy: 3,
            behindBy: 0,
            risk: branchAiRes.body.data.mergeRisk,
          },
        });

      expect(saveComparisonRes.status).toBe(201);
      expect(saveComparisonRes.body.id).toBe('inv-uuid-801');
      expect(saveComparisonRes.body.context.base).toBe('master');
      expect(saveComparisonRes.body.context.head).toBe('bpf-next');
    });
  });
});
