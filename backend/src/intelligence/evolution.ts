// Server-side Repository Evolution Engine
// Computes activity periods, growth trajectory, and monthly timeline evolution

import type {
  GithubApiCommitSummary,
  GithubApiCommitDetail,
} from '../github/types.js';
import type {
  ActivityPeriod,
  GrowthTrajectory,
  EvolutionTimelineBucket,
  RepositoryEvolutionAnalysis,
} from './types.js';

interface CommitWithMeta {
  readonly commit: {
    readonly author?: {
      readonly name?: string;
      readonly date?: string;
    } | null;
    readonly committer?: {
      readonly name?: string;
      readonly date?: string;
    } | null;
  };
  readonly author?: {
    readonly login?: string;
  } | null;
  readonly stats?: {
    readonly additions?: number;
    readonly deletions?: number;
  };
}

function parseCommitDate(commit: CommitWithMeta): Date | null {
  const dateStr = commit.commit.author?.date || commit.commit.committer?.date;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Identifies activity periods over time and classifies their intensity.
 */
export function identifyActivityPeriods(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail | CommitWithMeta)[] = [],
  periodDays: number = 30
): ActivityPeriod[] {
  if (commits.length === 0) {
    return [];
  }

  const validDates: { date: Date; time: number }[] = [];
  for (const c of commits) {
    if (!c) continue;
    const d = parseCommitDate(c);
    if (d) {
      validDates.push({ date: d, time: d.getTime() });
    }
  }

  if (validDates.length === 0) {
    return [];
  }

  validDates.sort((a, b) => a.time - b.time);

  const firstTime = validDates[0]?.time ?? 0;
  const lastTime = validDates[validDates.length - 1]?.time ?? 0;
  const periodMs = Math.max(1, periodDays) * 24 * 60 * 60 * 1000;

  const totalPeriods = Math.max(1, Math.ceil((lastTime - firstTime + 1) / periodMs));
  const periodCounts: number[] = new Array(totalPeriods).fill(0);

  for (const { time } of validDates) {
    const periodIdx = Math.min(totalPeriods - 1, Math.floor((time - firstTime) / periodMs));
    periodCounts[periodIdx] = (periodCounts[periodIdx] || 0) + 1;
  }

  const avgCommitsPerPeriod = validDates.length / totalPeriods;
  const result: ActivityPeriod[] = [];

  for (let i = 0; i < totalPeriods; i++) {
    const periodStartTime = firstTime + i * periodMs;
    const periodEndTime = Math.min(lastTime, periodStartTime + periodMs - 1);

    const count = periodCounts[i] || 0;
    let intensity: 'surge' | 'steady' | 'quiet' | 'dormant';

    if (count === 0) {
      intensity = 'dormant';
    } else if (count >= avgCommitsPerPeriod * 1.5) {
      intensity = 'surge';
    } else if (count >= avgCommitsPerPeriod * 0.5) {
      intensity = 'steady';
    } else {
      intensity = 'quiet';
    }

    result.push({
      startDate: new Date(periodStartTime).toISOString().slice(0, 10),
      endDate: new Date(periodEndTime).toISOString().slice(0, 10),
      commitCount: count,
      intensity,
    });
  }

  return result;
}

/**
 * Assesses repository growth trajectory and momentum between recent and previous windows.
 */
export function assessGrowthTrajectory(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail | CommitWithMeta)[] = []
): GrowthTrajectory {
  if (commits.length === 0) {
    return {
      pattern: 'dormant',
      description: 'No commit history available to analyze trajectory.',
      recentVelocity: 0,
      previousVelocity: 0,
      momentumMultiplier: 0,
    };
  }

  if (commits.length <= 2) {
    return {
      pattern: 'sporadic',
      description: 'Low commit volume indicates sporadic or newly initialized activity.',
      recentVelocity: commits.length,
      previousVelocity: 0,
      momentumMultiplier: 1.0,
    };
  }

  const validDates: number[] = [];
  for (const c of commits) {
    if (!c) continue;
    const d = parseCommitDate(c);
    if (d) validDates.push(d.getTime());
  }

  if (validDates.length === 0) {
    return {
      pattern: 'sporadic',
      description: 'Unable to parse commit dates for trajectory evaluation.',
      recentVelocity: 0,
      previousVelocity: 0,
      momentumMultiplier: 0,
    };
  }

  validDates.sort((a, b) => a - b);
  const firstTime = validDates[0] ?? 0;
  const lastTime = validDates[validDates.length - 1] ?? 0;
  const midPoint = firstTime + (lastTime - firstTime) / 2;

  let previousVelocity = 0;
  let recentVelocity = 0;

  for (const t of validDates) {
    if (t < midPoint) {
      previousVelocity++;
    } else {
      recentVelocity++;
    }
  }

  const denom = previousVelocity > 0 ? previousVelocity : 1;
  const momentumMultiplier = Number((recentVelocity / denom).toFixed(2));

  let pattern: 'accelerating' | 'steady' | 'decelerating' | 'dormant' | 'sporadic';
  let description: string;

  if (recentVelocity === 0) {
    pattern = 'dormant';
    description = 'No recent commit activity observed in the second half of repository history.';
  } else if (momentumMultiplier >= 1.3) {
    pattern = 'accelerating';
    description = `Commit velocity is accelerating (+${Math.round((momentumMultiplier - 1) * 100)}% momentum over previous period).`;
  } else if (momentumMultiplier <= 0.7) {
    pattern = 'decelerating';
    description = `Commit velocity is decelerating (${Math.round((1 - momentumMultiplier) * 100)}% decrease in momentum).`;
  } else {
    pattern = 'steady';
    description = 'Commit activity maintains a steady and consistent pace over time.';
  }

  return {
    pattern,
    description,
    recentVelocity,
    previousVelocity,
    momentumMultiplier,
  };
}

/**
 * Computes the full repository evolution timeline with monthly buckets,
 * activity periods, and growth momentum.
 */
export function computeEvolutionTimeline(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail | CommitWithMeta)[] = []
): RepositoryEvolutionAnalysis {
  if (commits.length === 0) {
    return {
      totalSpanDays: 0,
      totalCommits: 0,
      periods: [],
      trajectory: assessGrowthTrajectory([]),
      monthlyBuckets: [],
      firstCommitDate: null,
      lastCommitDate: null,
    };
  }

  const monthlyMap = new Map<
    string,
    {
      period: string;
      commitCount: number;
      authors: Set<string>;
      additions: number;
      deletions: number;
    }
  >();

  let earliestTime = Infinity;
  let latestTime = -Infinity;
  let firstCommitDate: string | null = null;
  let lastCommitDate: string | null = null;

  for (const c of commits) {
    if (!c) continue;
    const d = parseCommitDate(c);
    if (!d) continue;

    const time = d.getTime();
    if (time < earliestTime) {
      earliestTime = time;
      firstCommitDate = d.toISOString();
    }
    if (time > latestTime) {
      latestTime = time;
      lastCommitDate = d.toISOString();
    }

    const monthKey = d.toISOString().slice(0, 7);
    const authorName = c.commit?.author?.name || c.author?.login || 'Unknown';
    const stats = 'stats' in c ? c.stats : undefined;
    const additions = stats?.additions || 0;
    const deletions = stats?.deletions || 0;

    const existing = monthlyMap.get(monthKey);
    if (existing) {
      existing.commitCount += 1;
      existing.authors.add(authorName);
      existing.additions += additions;
      existing.deletions += deletions;
    } else {
      const authors = new Set<string>();
      authors.add(authorName);
      monthlyMap.set(monthKey, {
        period: monthKey,
        commitCount: 1,
        authors,
        additions,
        deletions,
      });
    }
  }

  const monthlyBuckets: EvolutionTimelineBucket[] = Array.from(monthlyMap.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((bucket) => ({
      period: bucket.period,
      commitCount: bucket.commitCount,
      authorsCount: bucket.authors.size,
      additions: bucket.additions,
      deletions: bucket.deletions,
    }));

  let totalSpanDays = 0;
  if (earliestTime !== Infinity && latestTime !== -Infinity) {
    totalSpanDays = Math.max(1, Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)));
  }

  const periods = identifyActivityPeriods(commits);
  const trajectory = assessGrowthTrajectory(commits);

  return {
    totalSpanDays,
    totalCommits: commits.length,
    periods,
    trajectory,
    monthlyBuckets,
    firstCommitDate,
    lastCommitDate,
  };
}

/**
 * Alias for computeEvolutionTimeline.
 */
export const computeRepositoryEvolution = computeEvolutionTimeline;

