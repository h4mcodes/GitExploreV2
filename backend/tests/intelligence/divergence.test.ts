import { describe, it, expect } from 'vitest';
import {
  computeDivergence,
  summarizeCommitDelta,
} from '../../src/intelligence/divergence.js';
import type {
  GithubApiComparison,
  GithubApiCommitSummary,
  GithubApiCommitFile,
} from '../../src/github/types.js';

function createMockCommit(
  sha: string,
  message: string,
  authorName: string,
  login: string | null = null
): GithubApiCommitSummary {
  return {
    sha,
    html_url: `https://github.com/test/repo/commit/${sha}`,
    commit: {
      message,
      comment_count: 0,
      author: {
        name: authorName,
        email: `${authorName.toLowerCase()}@example.com`,
        date: '2026-10-01T12:00:00Z',
      },
      committer: null,
    },
    author: login
      ? {
          login,
          id: 1,
          avatar_url: '',
          html_url: '',
        }
      : null,
    committer: null,
    parents: [],
  };
}

function createMockFile(
  filename: string,
  additions: number,
  deletions: number
): GithubApiCommitFile {
  return {
    filename,
    status: 'modified',
    additions,
    deletions,
    changes: additions + deletions,
  };
}

describe('Branch Divergence Intelligence Engine', () => {
  describe('summarizeCommitDelta', () => {
    it('handles empty commit and file lists', () => {
      const summary = summarizeCommitDelta([], []);
      expect(summary.totalCommits).toBe(0);
      expect(summary.authors).toEqual([]);
      expect(summary.totalAdditions).toBe(0);
      expect(summary.totalDeletions).toBe(0);
      expect(summary.totalFilesChanged).toBe(0);
      expect(summary.commitMessages).toEqual([]);
    });

    it('aggregates author contributions and file stats', () => {
      const c1 = createMockCommit('c1', 'Feat: Add login', 'Alice', 'alice');
      const c2 = createMockCommit('c2', 'Fix: Auth bug', 'Alice', 'alice');
      const c3 = createMockCommit('c3', 'Docs: Readme', 'Bob', 'bob');

      const f1 = createMockFile('src/auth.ts', 120, 20);
      const f2 = createMockFile('README.md', 15, 5);

      const summary = summarizeCommitDelta([c1, c2, c3], [f1, f2]);

      expect(summary.totalCommits).toBe(3);
      expect(summary.totalFilesChanged).toBe(2);
      expect(summary.totalAdditions).toBe(135);
      expect(summary.totalDeletions).toBe(25);
      expect(summary.commitMessages).toEqual([
        'Feat: Add login',
        'Fix: Auth bug',
        'Docs: Readme',
      ]);

      expect(summary.authors).toEqual([
        { name: 'Alice', login: 'alice', commitCount: 2 },
        { name: 'Bob', login: 'bob', commitCount: 1 },
      ]);
    });
  });

  describe('computeDivergence', () => {
    it('computes divergence analysis from comparison payload', () => {
      const baseCommit = createMockCommit('base1', 'Base commit', 'Main Dev');
      const mergeBase = createMockCommit('mb1', 'Common ancestor', 'Root Dev');
      const deltaCommit = createMockCommit('d1', 'Branch work', 'Alice', 'alice');
      const changedFile = createMockFile('index.ts', 50, 10);

      const comparison: GithubApiComparison = {
        url: 'https://api.github.com/compare',
        html_url: 'https://github.com/compare',
        permalink_url: '',
        diff_url: '',
        patch_url: '',
        base_commit: baseCommit,
        merge_base_commit: mergeBase,
        status: 'ahead',
        ahead_by: 1,
        behind_by: 0,
        total_commits: 1,
        commits: [deltaCommit],
        files: [changedFile],
      };

      const analysis = computeDivergence('main', 'feature-auth', comparison);

      expect(analysis.baseRef).toBe('main');
      expect(analysis.headRef).toBe('feature-auth');
      expect(analysis.status).toBe('ahead');
      expect(analysis.aheadBy).toBe(1);
      expect(analysis.behindBy).toBe(0);
      expect(analysis.mergeBaseSha).toBe('mb1');
      expect(analysis.mergeBaseMessage).toBe('Common ancestor');
      expect(analysis.delta.totalCommits).toBe(1);
      expect(analysis.delta.totalAdditions).toBe(50);
      expect(analysis.delta.totalDeletions).toBe(10);
      expect(analysis.delta.authors[0]?.name).toBe('Alice');
    });

    it('handles diverged status with null merge base safely', () => {
      const baseCommit = createMockCommit('base1', 'Base', 'Dev');
      const comparison: GithubApiComparison = {
        url: '',
        html_url: '',
        permalink_url: '',
        diff_url: '',
        patch_url: '',
        base_commit: baseCommit,
        merge_base_commit: {
          sha: '',
          html_url: '',
          commit: { message: '', comment_count: 0, author: null, committer: null },
          author: null,
          committer: null,
          parents: [],
        },
        status: 'diverged',
        ahead_by: 3,
        behind_by: 5,
        total_commits: 0,
        commits: [],
        files: [],
      };

      const analysis = computeDivergence('main', 'exp', comparison);
      expect(analysis.status).toBe('diverged');
      expect(analysis.aheadBy).toBe(3);
      expect(analysis.behindBy).toBe(5);
      expect(analysis.mergeBaseSha).toBeNull();
      expect(analysis.mergeBaseMessage).toBeNull();
    });
  });
});
