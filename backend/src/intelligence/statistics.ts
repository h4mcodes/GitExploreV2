// Server-side Commit Statistics Engine
// Computes deterministic commit metrics: frequency, additions/deletions, timeline distributions

import type {
  GithubApiCommitSummary,
  GithubApiCommitDetail,
} from '../github/types.js';
import type {
  CommitFrequencyStats,
  CommitChangeStats,
  CommitTimelineDistribution,
  CommitStatistics,
} from './types.js';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function extractCommitDate(commit: GithubApiCommitSummary | GithubApiCommitDetail): Date | null {
  const dateStr = commit.commit.author?.date || commit.commit.committer?.date;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Computes commit frequency metrics across the commit collection:
 * active days count, time span in days, commits per day, and commits per week.
 */
export function computeCommitFrequency(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail)[]
): CommitFrequencyStats {
  const totalCommits = commits.length;
  if (totalCommits === 0) {
    return {
      totalCommits: 0,
      activeDaysCount: 0,
      timeSpanDays: 0,
      commitsPerDay: 0,
      commitsPerWeek: 0,
      firstCommitDate: null,
      lastCommitDate: null,
    };
  }

  const activeDaysSet = new Set<string>();
  let earliestTime = Infinity;
  let latestTime = -Infinity;
  let earliestIso: string | null = null;
  let latestIso: string | null = null;

  for (const commit of commits) {
    if (!commit) continue;
    const date = extractCommitDate(commit);
    if (!date) continue;

    const time = date.getTime();
    const isoDateOnly = date.toISOString().slice(0, 10);
    activeDaysSet.add(isoDateOnly);

    if (time < earliestTime) {
      earliestTime = time;
      earliestIso = date.toISOString();
    }
    if (time > latestTime) {
      latestTime = time;
      latestIso = date.toISOString();
    }
  }

  const activeDaysCount = activeDaysSet.size;
  let timeSpanDays = 0;
  if (earliestTime !== Infinity && latestTime !== -Infinity) {
    const diffMs = Math.max(0, latestTime - earliestTime);
    timeSpanDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const effectiveSpan = Math.max(1, timeSpanDays);
  const commitsPerDay = Number((totalCommits / effectiveSpan).toFixed(2));
  const commitsPerWeek = Number(((totalCommits / effectiveSpan) * 7).toFixed(2));

  return {
    totalCommits,
    activeDaysCount,
    timeSpanDays,
    commitsPerDay,
    commitsPerWeek,
    firstCommitDate: earliestIso,
    lastCommitDate: latestIso,
  };
}

/**
 * Computes cumulative and average code additions, deletions, and total changes.
 */
export function computeChangeStats(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail)[]
): CommitChangeStats {
  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalChanges = 0;
  let commitsWithStatsCount = 0;

  for (const commit of commits) {
    if (!commit) continue;
    const detail = commit as GithubApiCommitDetail;
    if (detail.stats) {
      totalAdditions += detail.stats.additions || 0;
      totalDeletions += detail.stats.deletions || 0;
      totalChanges += detail.stats.total || (detail.stats.additions || 0) + (detail.stats.deletions || 0);
      commitsWithStatsCount++;
    }
  }

  const divisor = commitsWithStatsCount > 0 ? commitsWithStatsCount : 1;
  const avgAdditionsPerCommit = commitsWithStatsCount > 0 ? Number((totalAdditions / divisor).toFixed(2)) : 0;
  const avgDeletionsPerCommit = commitsWithStatsCount > 0 ? Number((totalDeletions / divisor).toFixed(2)) : 0;
  const avgChangesPerCommit = commitsWithStatsCount > 0 ? Number((totalChanges / divisor).toFixed(2)) : 0;

  return {
    totalAdditions,
    totalDeletions,
    totalChanges,
    avgAdditionsPerCommit,
    avgDeletionsPerCommit,
    avgChangesPerCommit,
    commitsWithStatsCount,
  };
}

/**
 * Aggregates commit distributions across day of week (Sun-Sat), hour of day (0-23),
 * months (YYYY-MM), and individual daily counts.
 */
export function computeActiveTimeline(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail)[]
): CommitTimelineDistribution {
  const byDayOfWeek: Record<string, number> = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };

  const byHourOfDay: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    byHourOfDay[h] = 0;
  }

  const byMonth: Record<string, number> = {};
  const dailyMap = new Map<string, number>();

  for (const commit of commits) {
    if (!commit) continue;
    const date = extractCommitDate(commit);
    if (!date) continue;

    const dayName = DAYS_OF_WEEK[date.getUTCDay()];
    if (dayName) {
      byDayOfWeek[dayName] = (byDayOfWeek[dayName] || 0) + 1;
    }

    const hour = date.getUTCHours();
    byHourOfDay[hour] = (byHourOfDay[hour] || 0) + 1;

    const yearMonth = date.toISOString().slice(0, 7);
    byMonth[yearMonth] = (byMonth[yearMonth] || 0) + 1;

    const dayKey = date.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
  }

  const dailyActivity = Array.from(dailyMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({ date, count }));

  return {
    byDayOfWeek,
    byHourOfDay,
    byMonth,
    dailyActivity,
  };
}

/**
 * Computes all commit statistics in one combined pass.
 */
export function computeCommitStatistics(
  commits: readonly (GithubApiCommitSummary | GithubApiCommitDetail)[],
  detailedCommits?: readonly GithubApiCommitDetail[]
): CommitStatistics {
  const commitsForChanges = detailedCommits && detailedCommits.length > 0 ? detailedCommits : commits;
  return {
    totalCommits: commits.length,
    frequency: computeCommitFrequency(commits),
    changeStats: computeChangeStats(commitsForChanges),
    timeline: computeActiveTimeline(commits),
  };
}

