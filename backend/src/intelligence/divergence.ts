// Server-side Branch Divergence Engine
// Computes deterministic branch divergence, ahead/behind counts, merge base, and commit delta summary

import type {
  GithubApiComparison,
  GithubApiCommitSummary,
  GithubApiCommitFile,
} from '../github/types.js';
import type {
  BranchDivergenceAnalysis,
  CommitDeltaSummary,
  CommitDeltaAuthorSummary,
} from './types.js';

/**
 * Summarizes the commit delta between two branches:
 * author distributions, total additions/deletions, files changed, and commit messages.
 */
export function summarizeCommitDelta(
  commits: readonly GithubApiCommitSummary[] = [],
  files: readonly GithubApiCommitFile[] = []
): CommitDeltaSummary {
  const authorMap = new Map<string, { name: string; login: string | null; count: number }>();
  const commitMessages: string[] = [];

  for (const commit of commits) {
    if (!commit) continue;

    const message = commit.commit.message || '';
    commitMessages.push(message);

    const authorName = commit.commit.author?.name || commit.author?.login || 'Unknown Author';
    const authorLogin = commit.author?.login || null;
    const authorKey = authorLogin || authorName;

    const existing = authorMap.get(authorKey);
    if (existing) {
      existing.count += 1;
    } else {
      authorMap.set(authorKey, {
        name: authorName,
        login: authorLogin,
        count: 1,
      });
    }
  }

  const authors: CommitDeltaAuthorSummary[] = Array.from(authorMap.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({
      name: entry.name,
      login: entry.login,
      commitCount: entry.count,
    }));

  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    if (!file) continue;
    totalAdditions += file.additions || 0;
    totalDeletions += file.deletions || 0;
  }

  return {
    totalCommits: commits.length,
    authors,
    totalAdditions,
    totalDeletions,
    totalFilesChanged: files.length,
    commitMessages,
  };
}

/**
 * Computes deterministic branch divergence metrics from a GitHub comparison payload.
 */
export function computeDivergence(
  baseRef: string,
  headRef: string,
  comparison: GithubApiComparison
): BranchDivergenceAnalysis {
  const mergeBaseSha = comparison.merge_base_commit?.sha || null;
  const mergeBaseMessage = comparison.merge_base_commit?.commit?.message || null;

  const delta = summarizeCommitDelta(comparison.commits || [], comparison.files || []);

  return {
    baseRef,
    headRef,
    status: comparison.status,
    aheadBy: comparison.ahead_by,
    behindBy: comparison.behind_by,
    mergeBaseSha,
    mergeBaseMessage,
    delta,
  };
}
