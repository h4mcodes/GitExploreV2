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

  it('identifies octopus merges with 3 or more parents', () => {
    const base = createMockCommit('base00000000000000000000000000000000000', []);
    const feat1 = createMockCommit('feat10000000000000000000000000000000000', [base.sha]);
    const feat2 = createMockCommit('feat20000000000000000000000000000000000', [base.sha]);
    const feat3 = createMockCommit('feat30000000000000000000000000000000000', [base.sha]);
    const octopus = createMockCommit('octo0000000000000000000000000000000000', [feat1.sha, feat2.sha, feat3.sha]);

    const graph = buildCommitRelationshipModel([octopus, feat3, feat2, feat1, base]);

    expect(graph.nodes[octopus.sha].isMerge).toBe(true);
    expect(graph.nodes[octopus.sha].parentShas).toEqual([feat1.sha, feat2.sha, feat3.sha]);
    expect(graph.nodes[feat1.sha].childShas).toContain(octopus.sha);
    expect(graph.nodes[feat2.sha].childShas).toContain(octopus.sha);
    expect(graph.nodes[feat3.sha].childShas).toContain(octopus.sha);
    expect(graph.rootShas).toEqual([base.sha]);
    expect(graph.headShas).toEqual([octopus.sha]);
  });

  it('correctly builds a diamond graph and resolves parent/child traversal', () => {
    //        base
    //       /    \
    //    left    right
    //       \    /
    //        join
    const base = createMockCommit('base00000000000000000000000000000000001', []);
    const left = createMockCommit('left00000000000000000000000000000000001', [base.sha]);
    const right = createMockCommit('righ00000000000000000000000000000000001', [base.sha]);
    const join = createMockCommit('join00000000000000000000000000000000001', [left.sha, right.sha]);

    const graph = buildCommitRelationshipModel([join, right, left, base]);

    expect(graph.totalCommits).toBe(4);
    expect(graph.nodes[join.sha].isMerge).toBe(true);
    expect(graph.nodes[base.sha].childShas.sort()).toEqual([left.sha, right.sha].sort());

    const parentsOfJoin = getParentCommits(graph, join.sha);
    expect(parentsOfJoin.map((p) => p.sha).sort()).toEqual([left.sha, right.sha].sort());

    const childrenOfBase = getChildCommits(graph, base.sha);
    expect(childrenOfBase.map((c) => c.sha).sort()).toEqual([left.sha, right.sha].sort());
  });

  it('handles multiple disconnected roots and multiple independent heads', () => {
    // Two disconnected repos/histories merged into one list
    const r1 = createMockCommit('root10000000000000000000000000000000000', []);
    const h1 = createMockCommit('head10000000000000000000000000000000000', [r1.sha]);
    const r2 = createMockCommit('root20000000000000000000000000000000000', []);
    const h2 = createMockCommit('head20000000000000000000000000000000000', [r2.sha]);

    const graph = buildCommitRelationshipModel([h1, h2, r1, r2]);

    expect(graph.totalCommits).toBe(4);
    expect(graph.rootShas.sort()).toEqual([r1.sha, r2.sha].sort());
    expect(graph.headShas.sort()).toEqual([h1.sha, h2.sha].sort());
  });

  it('deduplicates commits with identical SHAs without corrupting relations', () => {
    const c1 = createMockCommit('1111111111111111111111111111111111111111', []);
    const c2 = createMockCommit('2222222222222222222222222222222222222222', [c1.sha]);
    // duplicate c1 and c2 in array
    const graph = buildCommitRelationshipModel([c2, c1, c2, c1]);

    expect(graph.totalCommits).toBe(2);
    expect(graph.orderedShas).toEqual([c2.sha, c1.sha]);
    expect(graph.nodes[c1.sha].childShas).toEqual([c2.sha]);
  });

  it('handles commits with missing or partial metadata gracefully', () => {
    const incompleteCommit: GithubApiCommitSummary = {
      sha: 'inc00000000000000000000000000000000000',
      html_url: '',
      commit: {
        message: 'No author info',
        comment_count: 0,
        author: null,
        committer: null,
      },
      author: null,
      committer: null,
      parents: [],
    };

    const graph = buildCommitRelationshipModel([incompleteCommit]);

    expect(graph.totalCommits).toBe(1);
    const node = graph.nodes[incompleteCommit.sha];
    expect(node).toBeDefined();
    expect(node.author.name).toBe('Unknown Author');
    expect(node.author.email).toBeNull();
    expect(node.isRoot).toBe(true);
  });

  describe('Large Scale Graph Stress Testing (1,000+ Commits)', () => {
    it('efficiently builds a DAG for 1,200 sequential commits in O(N)', () => {
      const count = 1200;
      const commits: GithubApiCommitSummary[] = [];

      for (let i = 0; i < count; i++) {
        const sha = `sha${String(i).padStart(37, '0')}`;
        const parentSha = i > 0 ? `sha${String(i - 1).padStart(37, '0')}` : undefined;
        commits.push(createMockCommit(sha, parentSha ? [parentSha] : []));
      }

      // Reverse so newest is first (standard GitHub API ordering)
      commits.reverse();

      const startTime = performance.now();
      const graph = buildCommitRelationshipModel(commits);
      const elapsed = performance.now() - startTime;

      expect(graph.totalCommits).toBe(count);
      expect(graph.rootShas).toEqual([`sha${String(0).padStart(37, '0')}`]);
      expect(graph.headShas).toEqual([`sha${String(count - 1).padStart(37, '0')}`]);

      // Verify intermediate bidirectional links
      const midSha = `sha${String(500).padStart(37, '0')}`;
      const prevSha = `sha${String(499).padStart(37, '0')}`;
      const nextSha = `sha${String(501).padStart(37, '0')}`;

      expect(graph.nodes[midSha].parentShas).toEqual([prevSha]);
      expect(graph.nodes[midSha].childShas).toEqual([nextSha]);

      // Should complete quickly under 150ms
      expect(elapsed).toBeLessThan(500);
    });

    it('correctly models 1,000 commits with periodic branching and merges', () => {
      const commits: GithubApiCommitSummary[] = [];
      const rootSha = 'sha00000000000000000000000000000000000';
      commits.push(createMockCommit(rootSha, []));

      let currentMainSha = rootSha;
      let mergeCount = 0;

      // Build 100 cycles of: 7 main commits, 2 branch commits, 1 merge commit = 10 commits per cycle
      for (let cycle = 0; cycle < 100; cycle++) {
        // Main commits
        for (let m = 0; m < 7; m++) {
          const nextMain = `main_${cycle}_${m}_0000000000000000000000000`;
          commits.push(createMockCommit(nextMain, [currentMainSha]));
          currentMainSha = nextMain;
        }

        // Feature branch diverging from currentMainSha
        const b1 = `feat_${cycle}_1_0000000000000000000000000`;
        const b2 = `feat_${cycle}_2_0000000000000000000000000`;
        commits.push(createMockCommit(b1, [currentMainSha]));
        commits.push(createMockCommit(b2, [b1]));

        // Merge commit
        const mergeSha = `merge_${cycle}_00000000000000000000000000`;
        commits.push(createMockCommit(mergeSha, [currentMainSha, b2]));
        currentMainSha = mergeSha;
        mergeCount++;
      }

      // Total commits = 1 (root) + 100 * 10 = 1,001 commits
      expect(commits.length).toBe(1001);

      commits.reverse(); // API order
      const graph = buildCommitRelationshipModel(commits);

      expect(graph.totalCommits).toBe(1001);
      expect(graph.rootShas).toEqual([rootSha]);
      expect(graph.headShas).toEqual([currentMainSha]);

      // Verify all merge commits identified
      const mergeNodes = Object.values(graph.nodes).filter((n) => n.isMerge);
      expect(mergeNodes.length).toBe(mergeCount);
    });
  });
});
