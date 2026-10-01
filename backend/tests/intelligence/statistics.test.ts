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
  });
});
