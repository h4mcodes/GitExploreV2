import { describe, it, expect } from 'vitest';
import {
  identifyActivityPeriods,
  assessGrowthTrajectory,
  computeEvolutionTimeline,
} from '../../src/intelligence/evolution.js';
import type { GithubApiCommitDetail } from '../../src/github/types.js';

function createMockCommit(
  sha: string,
  dateStr: string,
  authorName: string = 'Dev',
  stats?: { additions: number; deletions: number; total: number }
): GithubApiCommitDetail {
  return {
    sha,
    html_url: `https://github.com/test/repo/commit/${sha}`,
    commit: {
      message: `Commit ${sha}`,
      comment_count: 0,
      author: {
        name: authorName,
        email: `${authorName.toLowerCase()}@example.com`,
        date: dateStr,
      },
      committer: null,
    },
    author: null,
    committer: null,
    parents: [],
    stats,
  };
}

describe('Repository Evolution Intelligence Engine', () => {
  describe('identifyActivityPeriods', () => {
    it('handles empty commit array', () => {
      const periods = identifyActivityPeriods([]);
      expect(periods).toEqual([]);
    });

    it('identifies periods and classifies intensity (surge vs quiet)', () => {
      // Month 1: 1 commit (quiet)
      // Month 2: 10 commits (surge)
      const c1 = createMockCommit('c1', '2026-01-01T00:00:00Z');
      const surgeCommits = Array.from({ length: 10 }, (_, i) =>
        createMockCommit(`s${i}`, '2026-02-05T00:00:00Z')
      );

      const periods = identifyActivityPeriods([c1, ...surgeCommits], 30);
      expect(periods.length).toBeGreaterThan(1);
      const firstPeriod = periods[0];
      const secondPeriod = periods[1];

      expect(firstPeriod?.intensity).toBe('quiet');
      expect(secondPeriod?.intensity).toBe('surge');
    });
  });

  describe('assessGrowthTrajectory', () => {
    it('identifies dormant state when empty', () => {
      const trajectory = assessGrowthTrajectory([]);
      expect(trajectory.pattern).toBe('dormant');
      expect(trajectory.recentVelocity).toBe(0);
    });

    it('identifies sporadic pattern for 2 or fewer commits', () => {
      const c1 = createMockCommit('c1', '2026-01-01T00:00:00Z');
      const c2 = createMockCommit('c2', '2026-01-02T00:00:00Z');
      const trajectory = assessGrowthTrajectory([c1, c2]);
      expect(trajectory.pattern).toBe('sporadic');
    });

    it('detects accelerating trajectory when second half volume exceeds first half', () => {
      const c1 = createMockCommit('c1', '2026-01-01T00:00:00Z');
      const c2 = createMockCommit('c2', '2026-01-10T00:00:00Z');
      // Surge in second half
      const c3 = createMockCommit('c3', '2026-02-20T00:00:00Z');
      const c4 = createMockCommit('c4', '2026-02-22T00:00:00Z');
      const c5 = createMockCommit('c5', '2026-02-25T00:00:00Z');
      const c6 = createMockCommit('c6', '2026-02-28T00:00:00Z');

      const trajectory = assessGrowthTrajectory([c1, c2, c3, c4, c5, c6]);
      expect(trajectory.pattern).toBe('accelerating');
      expect(trajectory.recentVelocity).toBe(4);
      expect(trajectory.previousVelocity).toBe(2);
      expect(trajectory.momentumMultiplier).toBe(2);
    });

    it('detects decelerating trajectory when activity slows down', () => {
      const c1 = createMockCommit('c1', '2026-01-01T00:00:00Z');
      const c2 = createMockCommit('c2', '2026-01-05T00:00:00Z');
      const c3 = createMockCommit('c3', '2026-01-10T00:00:00Z');
      const c4 = createMockCommit('c4', '2026-01-15T00:00:00Z');
      const c5 = createMockCommit('c5', '2026-02-28T00:00:00Z');

      const trajectory = assessGrowthTrajectory([c1, c2, c3, c4, c5]);
      expect(trajectory.pattern).toBe('decelerating');
      expect(trajectory.recentVelocity).toBe(1);
      expect(trajectory.previousVelocity).toBe(4);
    });
  });

  describe('computeEvolutionTimeline', () => {
    it('aggregates monthly buckets, author counts, and additions/deletions', () => {
      const c1 = createMockCommit('c1', '2026-01-15T12:00:00Z', 'Alice', { additions: 100, deletions: 10, total: 110 });
      const c2 = createMockCommit('c2', '2026-01-20T12:00:00Z', 'Bob', { additions: 50, deletions: 5, total: 55 });
      const c3 = createMockCommit('c3', '2026-02-10T12:00:00Z', 'Alice', { additions: 200, deletions: 20, total: 220 });

      const evolution = computeEvolutionTimeline([c1, c2, c3]);

      expect(evolution.totalCommits).toBe(3);
      expect(evolution.totalSpanDays).toBeGreaterThan(20);
      expect(evolution.monthlyBuckets.length).toBe(2);

      const jan = evolution.monthlyBuckets[0];
      expect(jan?.period).toBe('2026-01');
      expect(jan?.commitCount).toBe(2);
      expect(jan?.authorsCount).toBe(2); // Alice and Bob
      expect(jan?.additions).toBe(150);
      expect(jan?.deletions).toBe(15);

      const feb = evolution.monthlyBuckets[1];
      expect(feb?.period).toBe('2026-02');
      expect(feb?.commitCount).toBe(1);
      expect(feb?.authorsCount).toBe(1); // Alice
      expect(feb?.additions).toBe(200);
      expect(feb?.deletions).toBe(20);
    });

    it('handles empty and single commit evolution gracefully', () => {
      const emptyEvolution = computeEvolutionTimeline([]);
      expect(emptyEvolution.totalCommits).toBe(0);
      expect(emptyEvolution.monthlyBuckets).toEqual([]);
      expect(emptyEvolution.firstCommitDate).toBeNull();
      expect(emptyEvolution.lastCommitDate).toBeNull();

      const single = createMockCommit('c1', '2026-05-10T12:00:00Z', 'Dev');
      const singleEvolution = computeEvolutionTimeline([single]);
      expect(singleEvolution.totalCommits).toBe(1);
      expect(singleEvolution.monthlyBuckets.length).toBe(1);
      expect(singleEvolution.monthlyBuckets[0]?.period).toBe('2026-05');
      expect(singleEvolution.monthlyBuckets[0]?.authorsCount).toBe(1);
    });

    it('detects steady trajectory when velocity is balanced', () => {
      const c1 = createMockCommit('c1', '2026-01-01T00:00:00Z');
      const c2 = createMockCommit('c2', '2026-01-05T00:00:00Z');
      const c3 = createMockCommit('c3', '2026-01-10T00:00:00Z');
      const c4 = createMockCommit('c4', '2026-01-20T00:00:00Z');
      const c5 = createMockCommit('c5', '2026-01-25T00:00:00Z');
      const c6 = createMockCommit('c6', '2026-01-30T00:00:00Z');

      const trajectory = assessGrowthTrajectory([c1, c2, c3, c4, c5, c6]);
      expect(trajectory.pattern).toBe('steady');
      expect(trajectory.recentVelocity).toBe(3);
      expect(trajectory.previousVelocity).toBe(3);
    });

    it('stress tests evolution timeline with 1,080 commits spanning 3 years', () => {
      // 36 months, 30 commits per month, 5 distinct authors per month
      const commits: GithubApiCommitDetail[] = [];
      const authors = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan'];

      for (let month = 0; month < 36; month++) {
        const year = 2023 + Math.floor(month / 12);
        const m = (month % 12) + 1;
        const monthStr = `${year}-${String(m).padStart(2, '0')}`;

        for (let c = 0; c < 30; c++) {
          const day = Math.min(28, c + 1);
          const author = authors[c % authors.length] || 'Alice';
          const dateStr = `${monthStr}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
          commits.push(createMockCommit(`sha_${month}_${c}`, dateStr, author, { additions: 10, deletions: 2, total: 12 }));
        }
      }

      const startTime = performance.now();
      const evolution = computeEvolutionTimeline(commits);
      const elapsed = performance.now() - startTime;

      expect(evolution.totalCommits).toBe(1080);
      expect(evolution.monthlyBuckets.length).toBe(36);
      expect(evolution.monthlyBuckets[0]?.period).toBe('2023-01');
      expect(evolution.monthlyBuckets[35]?.period).toBe('2025-12');

      for (const bucket of evolution.monthlyBuckets) {
        expect(bucket.commitCount).toBe(30);
        expect(bucket.authorsCount).toBe(5);
        expect(bucket.additions).toBe(300);
        expect(bucket.deletions).toBe(60);
      }

      // Fast execution under 300ms
      expect(elapsed).toBeLessThan(500);
    });
  });
});
