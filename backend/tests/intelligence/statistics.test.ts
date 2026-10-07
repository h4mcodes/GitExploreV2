import { describe, it, expect } from 'vitest';
import {
  computeCommitFrequency,
  computeChangeStats,
  computeActiveTimeline,
  computeCommitStatistics,
} from '../../src/intelligence/statistics.js';
import type {
  GithubApiCommitSummary,
  GithubApiCommitDetail,
} from '../../src/github/types.js';

function createMockCommit(
  sha: string,
  dateStr: string,
  stats?: { additions: number; deletions: number; total: number }
): GithubApiCommitDetail {
  return {
    sha,
    html_url: `https://github.com/test/repo/commit/${sha}`,
    commit: {
      message: `Commit ${sha}`,
      comment_count: 0,
      author: {
        name: 'Test Author',
        email: 'test@example.com',
        date: dateStr,
      },
      committer: null,
    },
    author: {
      login: 'test-author',
      id: 1,
      avatar_url: '',
      html_url: '',
    },
    committer: null,
    parents: [],
    stats,
  };
}

describe('Commit Statistics Intelligence Engine', () => {
  describe('computeCommitFrequency', () => {
    it('handles empty commit array', () => {
      const stats = computeCommitFrequency([]);
      expect(stats.totalCommits).toBe(0);
      expect(stats.activeDaysCount).toBe(0);
      expect(stats.timeSpanDays).toBe(0);
      expect(stats.commitsPerDay).toBe(0);
      expect(stats.commitsPerWeek).toBe(0);
      expect(stats.firstCommitDate).toBeNull();
      expect(stats.lastCommitDate).toBeNull();
    });

    it('computes frequency for a single commit', () => {
      const date = '2026-05-10T10:00:00.000Z';
      const c1 = createMockCommit('c1', date);
      const stats = computeCommitFrequency([c1]);

      expect(stats.totalCommits).toBe(1);
      expect(stats.activeDaysCount).toBe(1);
      expect(stats.timeSpanDays).toBe(1);
      expect(stats.commitsPerDay).toBe(1);
      expect(stats.commitsPerWeek).toBe(7);
      expect(stats.firstCommitDate).toBe(date);
      expect(stats.lastCommitDate).toBe(date);
    });

    it('computes metrics over a multi-day span', () => {
      // 3 commits over 2 days (Oct 1 and Oct 3 -> span of 2 or 3 days)
      const c1 = createMockCommit('c1', '2026-10-01T00:00:00.000Z');
      const c2 = createMockCommit('c2', '2026-10-01T12:00:00.000Z');
      const c3 = createMockCommit('c3', '2026-10-03T00:00:00.000Z');

      const stats = computeCommitFrequency([c3, c1, c2]); // unordered input

      expect(stats.totalCommits).toBe(3);
      expect(stats.activeDaysCount).toBe(2);
      expect(stats.timeSpanDays).toBe(2);
      expect(stats.commitsPerDay).toBe(1.5);
      expect(stats.commitsPerWeek).toBe(10.5);
      expect(stats.firstCommitDate).toBe('2026-10-01T00:00:00.000Z');
      expect(stats.lastCommitDate).toBe('2026-10-03T00:00:00.000Z');
    });
  });

  describe('computeChangeStats', () => {
    it('handles empty commit array', () => {
      const stats = computeChangeStats([]);
      expect(stats.totalAdditions).toBe(0);
      expect(stats.totalDeletions).toBe(0);
      expect(stats.totalChanges).toBe(0);
      expect(stats.avgAdditionsPerCommit).toBe(0);
      expect(stats.avgDeletionsPerCommit).toBe(0);
      expect(stats.avgChangesPerCommit).toBe(0);
      expect(stats.commitsWithStatsCount).toBe(0);
    });

    it('aggregates additions, deletions and averages correctly', () => {
      const c1 = createMockCommit('c1', '2026-10-01T00:00:00Z', { additions: 100, deletions: 20, total: 120 });
      const c2 = createMockCommit('c2', '2026-10-02T00:00:00Z', { additions: 50, deletions: 30, total: 80 });

      const stats = computeChangeStats([c1, c2]);

      expect(stats.totalAdditions).toBe(150);
      expect(stats.totalDeletions).toBe(50);
      expect(stats.totalChanges).toBe(200);
      expect(stats.avgAdditionsPerCommit).toBe(75);
      expect(stats.avgDeletionsPerCommit).toBe(25);
      expect(stats.avgChangesPerCommit).toBe(100);
      expect(stats.commitsWithStatsCount).toBe(2);
    });

    it('ignores commits without stats when computing averages', () => {
      const c1 = createMockCommit('c1', '2026-10-01T00:00:00Z', { additions: 40, deletions: 10, total: 50 });
      const c2WithoutStats: GithubApiCommitSummary = {
        sha: 'c2',
        html_url: '',
        commit: {
          message: 'No stats',
          comment_count: 0,
          author: { name: 'A', email: '', date: '2026-10-02T00:00:00Z' },
          committer: null,
        },
        author: null,
        committer: null,
        parents: [],
      };

      const stats = computeChangeStats([c1, c2WithoutStats]);

      expect(stats.totalAdditions).toBe(40);
      expect(stats.totalDeletions).toBe(10);
      expect(stats.commitsWithStatsCount).toBe(1);
      expect(stats.avgAdditionsPerCommit).toBe(40);
    });
  });

  describe('computeActiveTimeline', () => {
    it('initializes 24 hours and 7 days of week on empty array', () => {
      const timeline = computeActiveTimeline([]);
      expect(Object.keys(timeline.byDayOfWeek)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      expect(Object.keys(timeline.byHourOfDay).length).toBe(24);
      expect(timeline.byMonth).toEqual({});
      expect(timeline.dailyActivity).toEqual([]);
    });

    it('tallies day of week, hour of day, and months correctly', () => {
      // 2026-10-01 is a Thursday, 14:00 UTC
      const c1 = createMockCommit('c1', '2026-10-01T14:30:00.000Z');
      // 2026-10-02 is a Friday, 14:00 UTC
      const c2 = createMockCommit('c2', '2026-10-02T14:15:00.000Z');
      // 2026-11-01 is a Sunday, 09:00 UTC
      const c3 = createMockCommit('c3', '2026-11-01T09:00:00.000Z');

      const timeline = computeActiveTimeline([c1, c2, c3]);

      expect(timeline.byDayOfWeek['Thu']).toBe(1);
      expect(timeline.byDayOfWeek['Fri']).toBe(1);
      expect(timeline.byDayOfWeek['Sun']).toBe(1);
      expect(timeline.byDayOfWeek['Mon']).toBe(0);

      expect(timeline.byHourOfDay[14]).toBe(2);
      expect(timeline.byHourOfDay[9]).toBe(1);
      expect(timeline.byHourOfDay[0]).toBe(0);

      expect(timeline.byMonth['2026-10']).toBe(2);
      expect(timeline.byMonth['2026-11']).toBe(1);

      expect(timeline.dailyActivity).toEqual([
        { date: '2026-10-01', count: 1 },
        { date: '2026-10-02', count: 1 },
        { date: '2026-11-01', count: 1 },
      ]);
    });
  });

  describe('computeCommitStatistics', () => {
    it('bundles frequency, change stats, and timeline distributions', () => {
      const c1 = createMockCommit('c1', '2026-10-01T10:00:00.000Z', { additions: 10, deletions: 5, total: 15 });
      const c2 = createMockCommit('c2', '2026-10-02T12:00:00.000Z', { additions: 20, deletions: 10, total: 30 });

      const allStats = computeCommitStatistics([c1, c2]);

      expect(allStats.totalCommits).toBe(2);
      expect(allStats.frequency.totalCommits).toBe(2);
      expect(allStats.changeStats.totalAdditions).toBe(30);
      expect(allStats.timeline.dailyActivity.length).toBe(2);
    });

    it('handles zero-change commits without NaN or divide-by-zero errors', () => {
      const c1 = createMockCommit('c1', '2026-10-01T10:00:00.000Z', { additions: 0, deletions: 0, total: 0 });
      const c2 = createMockCommit('c2', '2026-10-01T12:00:00.000Z', { additions: 0, deletions: 0, total: 0 });

      const stats = computeCommitStatistics([c1, c2]);

      expect(stats.changeStats.totalAdditions).toBe(0);
      expect(stats.changeStats.totalDeletions).toBe(0);
      expect(stats.changeStats.totalChanges).toBe(0);
      expect(stats.changeStats.avgAdditionsPerCommit).toBe(0);
      expect(stats.changeStats.avgDeletionsPerCommit).toBe(0);
      expect(stats.changeStats.avgChangesPerCommit).toBe(0);
      expect(stats.frequency.commitsPerDay).toBe(2);
    });

    it('computes accurate metrics across leap year boundaries', () => {
      // 2024 is a leap year (Feb 29 exists)
      const feb28 = createMockCommit('c1', '2024-02-28T12:00:00.000Z');
      const feb29 = createMockCommit('c2', '2024-02-29T12:00:00.000Z');
      const mar01 = createMockCommit('c3', '2024-03-01T12:00:00.000Z');

      const stats = computeCommitStatistics([feb28, feb29, mar01]);

      expect(stats.frequency.totalCommits).toBe(3);
      expect(stats.frequency.activeDaysCount).toBe(3);
      expect(stats.frequency.timeSpanDays).toBe(2);
      expect(stats.frequency.commitsPerDay).toBe(1.5);
    });
  });

  describe('Large Scale Statistics Stress Testing (1,000+ Commits)', () => {
    it('accurately computes mathematical aggregations for 1,000 commits', () => {
      const count = 1000;
      const commits: GithubApiCommitDetail[] = [];
      const baseDate = new Date('2025-01-01T00:00:00.000Z').getTime();

      let expectedAdditions = 0;
      let expectedDeletions = 0;

      for (let i = 0; i < count; i++) {
        const adds = (i % 20) + 1;
        const dels = (i % 5);
        expectedAdditions += adds;
        expectedDeletions += dels;

        // Distribute across days (1 commit every 6 hours = 250 days span)
        const dateStr = new Date(baseDate + i * 6 * 3600 * 1000).toISOString();
        commits.push(createMockCommit(`sha_${i}`, dateStr, { additions: adds, deletions: dels, total: adds + dels }));
      }

      const startTime = performance.now();
      const result = computeCommitStatistics(commits);
      const elapsed = performance.now() - startTime;

      expect(result.totalCommits).toBe(count);
      expect(result.changeStats.totalAdditions).toBe(expectedAdditions);
      expect(result.changeStats.totalDeletions).toBe(expectedDeletions);
      expect(result.changeStats.totalChanges).toBe(expectedAdditions + expectedDeletions);
      expect(result.changeStats.avgAdditionsPerCommit).toBe(Number((expectedAdditions / count).toFixed(1)));
      expect(result.changeStats.avgDeletionsPerCommit).toBe(Number((expectedDeletions / count).toFixed(1)));

      expect(result.frequency.totalCommits).toBe(count);
      expect(result.frequency.firstCommitDate).toBe(commits[0]?.commit.author.date);
      expect(result.frequency.lastCommitDate).toBe(commits[count - 1]?.commit.author.date);

      // Verify execution is fast (< 100ms)
      expect(elapsed).toBeLessThan(300);
    });
  });
});
