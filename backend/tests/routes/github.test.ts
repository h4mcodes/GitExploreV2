import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { githubClient } from '../../src/github/client.js';
import { NotFoundError, RateLimitError } from '../../src/types/api.js';

// Mock the githubClient methods
vi.mock('../../src/github/client.js', () => ({
  githubClient: {
    getUser: vi.fn(),
    getUserRepos: vi.fn(),
    getRepo: vi.fn(),
    getBranches: vi.fn(),
    getCommits: vi.fn(),
    getCommit: vi.fn(),
    compareCommits: vi.fn(),
    getRateLimitInfo: vi.fn(),
  },
}));

describe('GitHub Routes - GET /api/github/users/:username', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns HTTP 200 with normalized profile data for a valid user', async () => {
    const mockUser = {
      login: 'torvalds',
      id: 1024025,
      avatar_url: 'https://avatars.githubusercontent.com/u/1024025?v=4',
      html_url: 'https://github.com/torvalds',
      name: 'Linus Torvalds',
      company: 'Linux Foundation',
      blog: 'https://kernel.org',
      location: 'Portland, OR',
      email: null,
      bio: 'Creator of Linux and Git',
      public_repos: 6,
      followers: 210000,
      following: 0,
      created_at: '2011-09-03T15:26:22Z',
    };

    vi.mocked(githubClient.getUser).mockResolvedValueOnce(mockUser);

    const response = await request(app).get('/api/github/users/torvalds');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUser);
    expect(githubClient.getUser).toHaveBeenCalledWith('torvalds');
  });

  it('returns HTTP 400 when username format violates GitHub naming conventions', async () => {
    const response = await request(app).get('/api/github/users/-invalid-user');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(githubClient.getUser).not.toHaveBeenCalled();
  });

  it('returns HTTP 404 when user is not found on GitHub', async () => {
    vi.mocked(githubClient.getUser).mockRejectedValueOnce(
      new NotFoundError('GitHub resource not found at /users/nonexistent-user-12345', 'GITHUB_NOT_FOUND')
    );

    const response = await request(app).get('/api/github/users/nonexistent-user-12345');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('GITHUB_NOT_FOUND');
    expect(response.body.error).toContain('not found');
  });

  it('returns HTTP 429 when GitHub API rate limit is reached', async () => {
    vi.mocked(githubClient.getUser).mockRejectedValueOnce(
      new RateLimitError(
        'GitHub API rate limit exceeded. Resets at 2026-09-29T21:00:00.000Z',
        'GITHUB_RATE_LIMIT_EXCEEDED'
      )
    );

    const response = await request(app).get('/api/github/users/torvalds');

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('GITHUB_RATE_LIMIT_EXCEEDED');
  });
});
