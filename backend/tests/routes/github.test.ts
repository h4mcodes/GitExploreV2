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

describe('GitHub Routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/github/users/:username', () => {
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

  describe('GET /api/github/users/:username/repos', () => {
    it('returns HTTP 200 with repository list for valid user', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'linux',
          full_name: 'torvalds/linux',
          owner: { login: 'torvalds', id: 1024025, avatar_url: '' },
          private: false,
          html_url: 'https://github.com/torvalds/linux',
          description: 'Linux kernel source tree',
          fork: false,
          url: 'https://api.github.com/repos/torvalds/linux',
          created_at: '2011-09-04T22:48:12Z',
          updated_at: '2026-09-29T12:00:00Z',
          pushed_at: '2026-09-29T11:00:00Z',
          homepage: null,
          size: 4500000,
          stargazers_count: 180000,
          watchers_count: 180000,
          language: 'C',
          forks_count: 55000,
          open_issues_count: 400,
          default_branch: 'master',
        },
      ];

      vi.mocked(githubClient.getUserRepos).mockResolvedValueOnce(mockRepos);

      const response = await request(app).get('/api/github/users/torvalds/repos?page=2&per_page=50&sort=pushed');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRepos);
      expect(githubClient.getUserRepos).toHaveBeenCalledWith('torvalds', {
        page: 2,
        per_page: 50,
        sort: 'pushed',
        direction: 'desc',
      });
    });

    it('returns HTTP 400 when invalid query parameters are provided', async () => {
      const response = await request(app).get('/api/github/users/torvalds/repos?per_page=999');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(githubClient.getUserRepos).not.toHaveBeenCalled();
    });

    it('returns HTTP 404 when user does not exist for repo listing', async () => {
      vi.mocked(githubClient.getUserRepos).mockRejectedValueOnce(
        new NotFoundError('GitHub resource not found at /users/unknown-user/repos', 'GITHUB_NOT_FOUND')
      );

      const response = await request(app).get('/api/github/users/unknown-user/repos');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('GITHUB_NOT_FOUND');
    });
  });

  describe('GET /api/github/repos/:owner/:repo/branches', () => {
    it('returns HTTP 200 with branches list for valid repo', async () => {
      const mockBranches = [
        {
          name: 'master',
          commit: {
            sha: 'abcdef1234567890abcdef1234567890abcdef12',
            url: 'https://api.github.com/repos/torvalds/linux/commits/abcdef',
          },
          protected: true,
        },
        {
          name: 'next',
          commit: {
            sha: '123456abcdef123456abcdef123456abcdef1234',
            url: 'https://api.github.com/repos/torvalds/linux/commits/123456',
          },
          protected: false,
        },
      ];

      vi.mocked(githubClient.getBranches).mockResolvedValueOnce(mockBranches);

      const response = await request(app).get('/api/github/repos/torvalds/linux/branches?page=1&per_page=30');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBranches);
      expect(githubClient.getBranches).toHaveBeenCalledWith('torvalds', 'linux', {
        page: 1,
        per_page: 30,
      });
    });

    it('returns HTTP 400 when invalid owner or repo parameters are provided', async () => {
      const response = await request(app).get('/api/github/repos/-invalid-owner/invalid@repo/branches');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(githubClient.getBranches).not.toHaveBeenCalled();
    });

    it('returns HTTP 404 when repository is not found', async () => {
      vi.mocked(githubClient.getBranches).mockRejectedValueOnce(
        new NotFoundError('GitHub resource not found at /repos/torvalds/nonexistent/branches', 'GITHUB_NOT_FOUND')
      );

      const response = await request(app).get('/api/github/repos/torvalds/nonexistent/branches');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('GITHUB_NOT_FOUND');
      expect(response.body.error).toContain('not found');
    });
  });
});

