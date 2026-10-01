// Intelligence Engine Types for GitExplore V2
import type { GithubApiCommitSummary } from '../github/types.js';

export interface CommitNodeAuthor {
  readonly name: string;
  readonly email: string | null;
  readonly date: string;
  readonly avatarUrl: string | null;
  readonly login: string | null;
}

export interface CommitNode {
  readonly sha: string;
  readonly shortSha: string;
  readonly message: string;
  readonly author: CommitNodeAuthor;
  readonly timestamp: string;
  readonly parentShas: readonly string[];
  readonly childShas: string[];
  readonly isMerge: boolean;
  readonly isRoot: boolean;
  readonly htmlUrl: string;
  readonly rawCommit: GithubApiCommitSummary;
}

export interface CommitRelationshipGraph {
  readonly nodes: Record<string, CommitNode>;
  readonly orderedShas: readonly string[];
  readonly rootShas: readonly string[];
  readonly headShas: readonly string[];
  readonly totalCommits: number;
}

export interface CommitFrequencyStats {
  readonly totalCommits: number;
  readonly activeDaysCount: number;
  readonly timeSpanDays: number;
  readonly commitsPerDay: number;
  readonly commitsPerWeek: number;
  readonly firstCommitDate: string | null;
  readonly lastCommitDate: string | null;
}

export interface CommitChangeStats {
  readonly totalAdditions: number;
  readonly totalDeletions: number;
  readonly totalChanges: number;
  readonly avgAdditionsPerCommit: number;
  readonly avgDeletionsPerCommit: number;
  readonly avgChangesPerCommit: number;
  readonly commitsWithStatsCount: number;
}

export interface CommitTimelineDistribution {
  readonly byDayOfWeek: Record<string, number>;
  readonly byHourOfDay: Record<number, number>;
  readonly byMonth: Record<string, number>;
  readonly dailyActivity: readonly { readonly date: string; readonly count: number }[];
}

export interface CommitStatistics {
  readonly totalCommits: number;
  readonly frequency: CommitFrequencyStats;
  readonly changeStats: CommitChangeStats;
  readonly timeline: CommitTimelineDistribution;
}

