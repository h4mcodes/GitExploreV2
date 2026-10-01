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
