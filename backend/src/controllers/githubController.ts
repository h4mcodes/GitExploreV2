import { Request, Response, NextFunction } from 'express';
import { githubClient } from '../github/client.js';
import { GithubApiUser, GithubApiRepo } from '../github/types.js';

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
