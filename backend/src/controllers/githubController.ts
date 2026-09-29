import { Request, Response, NextFunction } from 'express';
import { githubClient } from '../github/client.js';
import { GithubApiUser } from '../github/types.js';

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
