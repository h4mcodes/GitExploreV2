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

export interface CommitDeltaAuthorSummary {
  readonly name: string;
  readonly login: string | null;
  readonly commitCount: number;
}

export interface CommitDeltaSummary {
  readonly totalCommits: number;
  readonly authors: readonly CommitDeltaAuthorSummary[];
  readonly totalAdditions: number;
  readonly totalDeletions: number;
  readonly totalFilesChanged: number;
  readonly commitMessages: readonly string[];
}

export interface BranchDivergenceAnalysis {
  readonly baseRef: string;
  readonly headRef: string;
  readonly status: 'ahead' | 'behind' | 'identical' | 'diverged';
  readonly aheadBy: number;
  readonly behindBy: number;
  readonly mergeBaseSha: string | null;
  readonly mergeBaseMessage: string | null;
  readonly delta: CommitDeltaSummary;
}

export interface FileMetrics {
  readonly filename: string;
  readonly changeCount: number;
  readonly additions: number;
  readonly deletions: number;
  readonly totalChanges: number;
  readonly churnScore: number;
  readonly lastModifiedDate: string | null;
  readonly statuses: readonly string[];
}

export interface FileChurnAnalysis {
  readonly totalFilesChanged: number;
  readonly totalFileModifications: number;
  readonly totalAdditions: number;
  readonly totalDeletions: number;
  readonly hotspots: readonly FileMetrics[];
  readonly fileExtensions: Record<string, number>;
}



