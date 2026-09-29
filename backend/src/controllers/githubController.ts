import { Request, Response, NextFunction } from 'express';
import { githubClient } from '../github/client.js';
import {
  GithubApiUser,
  GithubApiRepo,
  GithubApiBranch,
  GithubApiCommitSummary,
  GithubApiCommitDetail,
  GithubApiComparison,
} from '../github/types.js';
import { AppError } from '../types/api.js';

/**
 * Controller handler to fetch a normalized GitHub user profile by username.
 */
export async function getUserProfile(
  req: Request<{ username: string }>,
  res: Response<GithubApiUser>,
  next: NextFunction
): Promise<void> {
  try {
    const { username } = req.params;
    const user = await githubClient.getUser(username);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to fetch public repositories for a given user.
 */
export async function getUserRepositories(
  req: Request<
    { username: string },
    GithubApiRepo[],
    unknown,
    { page?: string; per_page?: string; sort?: string; direction?: string }
  >,
  res: Response<GithubApiRepo[]>,
  next: NextFunction
): Promise<void> {
  try {
    const { username } = req.params;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const per_page = req.query.per_page ? parseInt(req.query.per_page, 10) : 100;
    const sort = req.query.sort || 'updated';
    const direction = req.query.direction || 'desc';

    const repos = await githubClient.getUserRepos(username, {
      page: isNaN(page) ? 1 : page,
      per_page: isNaN(per_page) ? 100 : per_page,
      sort,
      direction,
    });

    res.status(200).json(repos);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to fetch branches of a repository.
 */
export async function getRepositoryBranches(
  req: Request<
    { owner: string; repo: string },
    GithubApiBranch[],
    unknown,
    { page?: string; per_page?: string }
  >,
  res: Response<GithubApiBranch[]>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo } = req.params;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const per_page = req.query.per_page ? parseInt(req.query.per_page, 10) : 100;

    const branches = await githubClient.getBranches(owner, repo, {
      page: isNaN(page) ? 1 : page,
      per_page: isNaN(per_page) ? 100 : per_page,
    });

    res.status(200).json(branches);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to fetch commits for a repository/branch.
 */
export async function getRepositoryCommits(
  req: Request<
    { owner: string; repo: string },
    GithubApiCommitSummary[],
    unknown,
    { sha?: string; page?: string; per_page?: string }
  >,
  res: Response<GithubApiCommitSummary[]>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo } = req.params;
    const { sha } = req.query;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const per_page = req.query.per_page ? parseInt(req.query.per_page, 10) : 30;

    const commits = await githubClient.getCommits(owner, repo, {
      sha,
      page: isNaN(page) ? 1 : page,
      per_page: isNaN(per_page) ? 30 : per_page,
    });

    res.status(200).json(commits);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to fetch single commit detail with file patches.
 */
export async function getCommitDetail(
  req: Request<{ owner: string; repo: string; sha: string }, GithubApiCommitDetail>,
  res: Response<GithubApiCommitDetail>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo, sha } = req.params;
    const commit = await githubClient.getCommit(owner, repo, sha);
    res.status(200).json(commit);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to compare two commits or branches.
 */
export async function compareBranches(
  req: Request<{ owner: string; repo: string; basehead: string }, GithubApiComparison>,
  res: Response<GithubApiComparison>,
  next: NextFunction
): Promise<void> {
  try {
    const { owner, repo, basehead } = req.params;
    const parts = basehead.split('...');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new AppError(
        'Comparison parameter must follow format <base>...<head>',
        400,
        'VALIDATION_ERROR'
      );
    }
    const [base, head] = parts;
    const comparison = await githubClient.compareCommits(owner, repo, base, head);
    res.status(200).json(comparison);
  } catch (err) {
    next(err);
  }
}

