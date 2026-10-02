import { Request, Response, NextFunction } from 'express';
import { githubClient } from '../github/client.js';
import { GithubApiCommitDetail } from '../github/types.js';
import {
  RepositoryAnalysis,
  buildCommitRelationshipGraph,
  computeCommitStatistics,
  computeDivergence,
  computeFileChurn,
  computeRepositoryEvolution,
} from '../intelligence/index.js';
import { NotFoundError } from '../types/api.js';

interface AnalysisCacheEntry {
  readonly data: RepositoryAnalysis;
  readonly expiresAt: number;
}

const analysisCache = new Map<string, AnalysisCacheEntry>();
const ANALYSIS_TTL_MS = 10 * 60 * 1000; // 10 minutes default TTL
const MAX_CACHE_SIZE = 100;

/**
 * Clears the repository analysis in-memory cache (primarily for unit tests).
 */
export function clearAnalysisCache(): void {
  analysisCache.clear();
}

/**
 * Helper to get cache key.
 */
function getCacheKey(owner: string, repo: string): string {
  return `${owner.trim().toLowerCase()}/${repo.trim().toLowerCase()}`;
}

/**
 * GET /api/repositories/:owner/:repo/analysis
 * Returns cached analysis if available, otherwise returns 404.
 */
export async function getRepositoryAnalysis(
  req: Request<{ owner: string; repo: string }>,
  res: Response<RepositoryAnalysis>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo } = req.params;
    const cacheKey = getCacheKey(owner, repo);
    const now = Date.now();

    const cached = analysisCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.status(200).json(cached.data);
      return;
    }

    throw new NotFoundError(
      `No analysis found for repository ${owner}/${repo}. Trigger analysis with POST /api/repositories/${owner}/${repo}/analyze`,
      'ANALYSIS_NOT_FOUND'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/repositories/:owner/:repo/analyze
 * Triggers full intelligence analysis, caches the result, and returns it.
 */
export async function analyzeRepository(
  req: Request<
    { owner: string; repo: string },
    RepositoryAnalysis,
    { branch?: string } | undefined,
    { branch?: string } | undefined
  >,
  res: Response<RepositoryAnalysis>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo } = req.params;
    const requestedBranch = req.body?.branch || req.query?.branch;

    // 1. Fetch Repository Metadata
    const repoMeta = await githubClient.getRepo(owner, repo);
    const targetBranch = requestedBranch || repoMeta.default_branch || 'main';

    // 2. Fetch Branches
    const branches = await githubClient.getBranches(owner, repo, { per_page: 30 });

    // 3. Fetch Commits on Target Branch
    const commits = await githubClient.getCommits(owner, repo, {
      sha: targetBranch,
      per_page: 100,
    });

    // 4. Fetch Detailed Commits for File Churn & Changes (up to 15 top commits)
    const commitDetailsToFetch = commits.slice(0, 15);
    const detailSettledResults = await Promise.allSettled(
      commitDetailsToFetch.map((c) => githubClient.getCommit(owner, repo, c.sha))
    );

    const detailedCommits: GithubApiCommitDetail[] = [];
    for (const result of detailSettledResults) {
      if (result.status === 'fulfilled' && result.value) {
        detailedCommits.push(result.value);
      }
    }

    // 5. Compute Branch Divergence (if another branch exists)
    let divergence = null;
    const secondaryBranch = branches.find((b) => b.name !== targetBranch);
    if (secondaryBranch) {
      try {
        const comparison = await githubClient.compareCommits(
          owner,
          repo,
          targetBranch,
          secondaryBranch.name
        );
        divergence = computeDivergence(targetBranch, secondaryBranch.name, comparison);
      } catch {
        // Divergence computation gracefully skipped if comparison endpoint fails or has no common base
        divergence = null;
      }
    }

    // 6. Execute Intelligence Engine Analyzers
    const graph = buildCommitRelationshipGraph(commits);
    const statistics = computeCommitStatistics(commits, detailedCommits);
    const fileAnalysis = computeFileChurn(detailedCommits);
    const evolution = computeRepositoryEvolution(commits);

    // 7. Assemble Consolidated Intelligence Analysis
    const analysis: RepositoryAnalysis = {
      owner: repoMeta.owner?.login || owner,
      repo: repoMeta.name,
      analyzedAt: new Date().toISOString(),
      defaultBranch: targetBranch,
      graph,
      statistics,
      divergence,
      fileAnalysis,
      evolution,
    };


    // 8. Cache Result
    const cacheKey = getCacheKey(owner, repo);
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const firstKey = analysisCache.keys().next().value;
      if (firstKey) {
        analysisCache.delete(firstKey);
      }
    }

    analysisCache.set(cacheKey, {
      data: analysis,
      expiresAt: Date.now() + ANALYSIS_TTL_MS,
    });

    res.status(200).json(analysis);
  } catch (err) {
    next(err);
  }
}
