import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCommitRelationshipModel,
  getParentCommits,
  getChildCommits,
  getCommitNode,
  clearCommitGraphCache,
} from '../../src/intelligence/commitGraph.js';
import type { GithubApiCommitSummary } from '../../src/github/types.js';

function createMockCommit(
  sha: string,
  parentShas: string[] = [],
  message: string = `Commit ${sha}`,
  authorName: string = 'Test Author',
  date: string = '2026-10-01T12:00:00Z'
): GithubApiCommitSummary {
  return {
    sha,
    html_url: `https://github.com/test/repo/commit/${sha}`,
    commit: {
      message,
      comment_count: 0,
      author: {
        name: authorName,
        email: `${authorName.toLowerCase().replace(' ', '.')}@example.com`,
        date,
      },
      committer: {
        name: authorName,
        email: `${authorName.toLowerCase().replace(' ', '.')}@example.com`,
        date,
      },
    },
    author: {
      login: authorName.toLowerCase().replace(' ', '-'),
      id: 12345,
      avatar_url: `https://avatars.githubusercontent.com/u/12345?v=4`,
      html_url: `https://github.com/${authorName.toLowerCase().replace(' ', '-')}`,
    },
    committer: null,
    parents: parentShas.map((pSha) => ({
      sha: pSha,
      url: `https://api.github.com/repos/test/repo/commits/${pSha}`,
      html_url: `https://github.com/test/repo/commit/${pSha}`,
    })),
  };
}

describe('Commit Graph Intelligence Engine (DAG)', () => {
  beforeEach(() => {
    clearCommitGraphCache();
  });

  it('handles empty commit array', () => {
    const graph = buildCommitRelationshipModel([]);
    expect(graph.totalCommits).toBe(0);
    expect(graph.orderedShas).toEqual([]);
    expect(graph.rootShas).toEqual([]);
    expect(graph.headShas).toEqual([]);
    expect(graph.nodes).toEqual({});
  });

  it('builds a DAG for a single root commit', () => {
    const commit = createMockCommit('c100000000000000000000000000000000000001');
    const graph = buildCommitRelationshipModel([commit]);

    expect(graph.totalCommits).toBe(1);
    expect(graph.orderedShas).toEqual([commit.sha]);
    expect(graph.rootShas).toEqual([commit.sha]);
    expect(graph.headShas).toEqual([commit.sha]);

    const node = graph.nodes[commit.sha];
    expect(node).toBeDefined();
    expect(node.isRoot).toBe(true);
    expect(node.isMerge).toBe(false);
    expect(node.parentShas).toEqual([]);
    expect(node.childShas).toEqual([]);
    expect(node.shortSha).toBe(commit.sha.slice(0, 7));
  });

  it('builds bidirectional links for linear history', () => {
    // c3 (newest, child) -> c2 -> c1 (oldest, root)
    const c1 = createMockCommit('1111111111111111111111111111111111111111', []);
    const c2 = createMockCommit('2222222222222222222222222222222222222222', ['1111111111111111111111111111111111111111']);
    const c3 = createMockCommit('3333333333333333333333333333333333333333', ['2222222222222222222222222222222222222222']);

    const commits = [c3, c2, c1];
    const graph = buildCommitRelationshipModel(commits);

    expect(graph.totalCommits).toBe(3);
    expect(graph.orderedShas).toEqual([c3.sha, c2.sha, c1.sha]);
    expect(graph.rootShas).toEqual([c1.sha]);
    expect(graph.headShas).toEqual([c3.sha]);

    // Check bidirectional relationships
    expect(graph.nodes[c1.sha].childShas).toEqual([c2.sha]);
    expect(graph.nodes[c2.sha].parentShas).toEqual([c1.sha]);
    expect(graph.nodes[c2.sha].childShas).toEqual([c3.sha]);
    expect(graph.nodes[c3.sha].parentShas).toEqual([c2.sha]);
    expect(graph.nodes[c3.sha].childShas).toEqual([]);
  });

  it('identifies merge commits with multiple parents', () => {
    // Branch commit b1 and main commit m1 diverge from base c1.
    // merge commit mg merges b1 and m1.
    const c1 = createMockCommit('c100000000000000000000000000000000000000', []);
    const b1 = createMockCommit('b100000000000000000000000000000000000000', [c1.sha]);
    const m1 = createMockCommit('m100000000000000000000000000000000000000', [c1.sha]);
    const mg = createMockCommit('mg00000000000000000000000000000000000000', [m1.sha, b1.sha]);

    const graph = buildCommitRelationshipModel([mg, m1, b1, c1]);

    expect(graph.nodes[mg.sha].isMerge).toBe(true);
    expect(graph.nodes[mg.sha].parentShas).toEqual([m1.sha, b1.sha]);
    expect(graph.nodes[m1.sha].childShas).toContain(mg.sha);
    expect(graph.nodes[b1.sha].childShas).toContain(mg.sha);
    expect(graph.nodes[c1.sha].childShas).toContain(m1.sha);
    expect(graph.nodes[c1.sha].childShas).toContain(b1.sha);
    expect(graph.rootShas).toEqual([c1.sha]);
    expect(graph.headShas).toEqual([mg.sha]);
  });

  it('treats boundary commits without known in-set parents as roots', () => {
    // c2 has parent 'outside_sha' which is not in the loaded array
    const c2 = createMockCommit('2222222222222222222222222222222222222222', ['outside_sha']);
    const c3 = createMockCommit('3333333333333333333333333333333333333333', [c2.sha]);

    const graph = buildCommitRelationshipModel([c3, c2]);

    expect(graph.rootShas).toEqual([c2.sha]);
    expect(graph.headShas).toEqual([c3.sha]);
    expect(graph.nodes[c2.sha].parentShas).toEqual(['outside_sha']);
    expect(graph.nodes[c2.sha].childShas).toEqual([c3.sha]);
  });

  it('supports node lookup and parent/child query helpers', () => {
    const c1 = createMockCommit('1111111111111111111111111111111111111111', []);
    const c2 = createMockCommit('2222222222222222222222222222222222222222', [c1.sha]);

    const graph = buildCommitRelationshipModel([c2, c1]);

    const node = getCommitNode(graph, c2.sha);
    expect(node?.sha).toBe(c2.sha);
    expect(getCommitNode(graph, 'nonexistent')).toBeUndefined();

    const parents = getParentCommits(graph, c2.sha);
    expect(parents.length).toBe(1);
    expect(parents[0].sha).toBe(c1.sha);

    const children = getChildCommits(graph, c1.sha);
    expect(children.length).toBe(1);
    expect(children[0].sha).toBe(c2.sha);

    expect(getParentCommits(graph, 'nonexistent')).toEqual([]);
    expect(getChildCommits(graph, 'nonexistent')).toEqual([]);
  });

  it('caches generated graph model by fingerprint', () => {
    const c1 = createMockCommit('1111111111111111111111111111111111111111', []);
    const c2 = createMockCommit('2222222222222222222222222222222222222222', [c1.sha]);
    const commits = [c2, c1];

    const graph1 = buildCommitRelationshipModel(commits);
    const graph2 = buildCommitRelationshipModel(commits);

    expect(graph1).toBe(graph2); // exact object reference from cache
  });
});
