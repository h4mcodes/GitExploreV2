// Server-side Commit Relationship DAG Engine
// Ports and extends the deterministic Git DAG model from GitExplore V1

import type { GithubApiCommitSummary } from '../github/types.js';
import type {
  CommitNode,
  CommitRelationshipGraph,
} from './types.js';

// In-memory LRU cache for graph models
const graphModelCache = new Map<string, CommitRelationshipGraph>();
const MAX_CACHE_ENTRIES = 100;

/**
 * Builds an in-memory directed acyclic graph (DAG) of commit relationships.
 * Computes parent -> child links, merge commit flags, root commits, and head commits.
 */
export function buildCommitRelationshipModel(
  commits: readonly GithubApiCommitSummary[]
): CommitRelationshipGraph {
  if (!commits || commits.length === 0) {
    return {
      nodes: {},
      orderedShas: [],
      rootShas: [],
      headShas: [],
      totalCommits: 0,
    };
  }

  // Generate deterministic cache key from commit count and boundary SHAs
  const firstCommit = commits[0];
  const lastCommit = commits[commits.length - 1];
  const firstSha = firstCommit ? firstCommit.sha : '';
  const lastSha = lastCommit ? lastCommit.sha : '';
  const fingerprint = `${commits.length}:${firstSha}:${lastSha}`;

  const cached = graphModelCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  const nodes: Record<string, CommitNode> = {};
  const orderedShas: string[] = [];
  const knownShas = new Set<string>();

  // Pass 1: Instantiate individual commit nodes
  for (const commit of commits) {
    if (!commit) continue;
    const sha = commit.sha;
    if (!sha || knownShas.has(sha)) continue;
    knownShas.add(sha);

    const parentShas = Array.isArray(commit.parents)
      ? commit.parents
          .map((p) => p?.sha)
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [];

    const date =
      commit.commit.author?.date ||
      commit.commit.committer?.date ||
      new Date().toISOString();
    const name =
      commit.commit.author?.name ||
      commit.commit.committer?.name ||
      commit.author?.login ||
      'Unknown Author';
    const email =
      commit.commit.author?.email ||
      commit.commit.committer?.email ||
      null;
    const avatarUrl =
      commit.author?.avatar_url ||
      commit.committer?.avatar_url ||
      null;
    const login =
      commit.author?.login ||
      commit.committer?.login ||
      null;

    nodes[sha] = {
      sha,
      shortSha: sha.slice(0, 7),
      message: commit.commit.message,
      author: {
        name,
        email,
        date,
        avatarUrl,
        login,
      },
      timestamp: date,
      parentShas,
      childShas: [],
      isMerge: parentShas.length > 1,
      isRoot: parentShas.length === 0,
      htmlUrl: commit.html_url,
      rawCommit: commit,
    };

    orderedShas.push(sha);
  }

  // Pass 2: Establish bidirectional parent -> child relationship links in O(N)
  for (const sha of orderedShas) {
    const node = nodes[sha];
    if (!node) continue;

    for (const parentSha of node.parentShas) {
      if (!parentSha) continue;
      const parentNode = nodes[parentSha];
      if (parentNode && !parentNode.childShas.includes(sha)) {
        parentNode.childShas.push(sha);
      }
    }
  }

  // Pass 3: Identify root commits and head commits
  const rootShas: string[] = [];
  const headShas: string[] = [];

  for (const sha of orderedShas) {
    const node = nodes[sha];
    if (!node) continue;

    const hasKnownParent = node.parentShas.some((pSha: string) => knownShas.has(pSha));
    if (node.parentShas.length === 0 || !hasKnownParent) {
      rootShas.push(sha);
    }
    if (node.childShas.length === 0) {
      headShas.push(sha);
    }
  }

  const result: CommitRelationshipGraph = {
    nodes,
    orderedShas,
    rootShas,
    headShas,
    totalCommits: orderedShas.length,
  };

  // LRU eviction if cache exceeds capacity
  if (graphModelCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = graphModelCache.keys().next().value;
    if (oldestKey) {
      graphModelCache.delete(oldestKey);
    }
  }
  graphModelCache.set(fingerprint, result);

  return result;
}

/**
 * Returns parent commit nodes for a given commit SHA.
 */
export function getParentCommits(
  graph: CommitRelationshipGraph,
  sha: string
): CommitNode[] {
  const node = graph.nodes[sha];
  if (!node) return [];
  return node.parentShas
    .map((parentSha) => graph.nodes[parentSha])
    .filter((p): p is CommitNode => p !== undefined);
}

/**
 * Returns child commit nodes for a given commit SHA.
 */
export function getChildCommits(
  graph: CommitRelationshipGraph,
  sha: string
): CommitNode[] {
  const node = graph.nodes[sha];
  if (!node) return [];
  return node.childShas
    .map((childSha) => graph.nodes[childSha])
    .filter((c): c is CommitNode => c !== undefined);
}

/**
 * Looks up a single commit node by SHA.
 */
export function getCommitNode(
  graph: CommitRelationshipGraph,
  sha: string
): CommitNode | undefined {
  return graph.nodes[sha];
}

/**
 * Clears the in-memory graph cache (utility for tests and cache invalidation).
 */
export function clearCommitGraphCache(): void {
  graphModelCache.clear();
}
