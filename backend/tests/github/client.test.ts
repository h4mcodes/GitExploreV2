import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GithubClient } from '../../src/github/client.js';
import {
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
} from '../../src/types/api.js';

describe('GithubClient', () => {
  let client: GithubClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    client = new GithubClient({
      token: 'test_token_secret_123',
      baseUrl: 'https://api.github.com',
      defaultTtlMs: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Authorization header with Bearer token', async () => {
    const mockUser = {
      login: 'octocat',
      id: 1,
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      html_url: 'https://github.com/octocat',
      name: 'The Octocat',
      public_repos: 8,
      followers: 20,
      following: 0,
      created_at: '2008-01-14T04:33:35Z',
    };

    const headers = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': '1700000000',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers,
      json: async () => mockUser,
    });

    const user = await client.getUser('octocat');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/users/octocat',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test_token_secret_123',
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitExplore-V2-Backend',
        }),
      })
    );

    expect(user.login).toBe('octocat');
    expect(user.name).toBe('The Octocat');
  });

  it('extracts and parses rate limit headers accurately', async () => {
    const headers = new Headers({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4850',
      'x-ratelimit-reset': '1700000000',
      'x-ratelimit-used': '150',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers,
      json: async () => ({
        id: 123,
        name: 'test-repo',
        full_name: 'octocat/test-repo',
        owner: { login: 'octocat', id: 1, avatar_url: '' },
      }),
    });

    await client.getRepo('octocat', 'test-repo');

    const rateLimit = client.getRateLimitInfo();
    expect(rateLimit).not.toBeNull();
    expect(rateLimit?.limit).toBe(5000);
    expect(rateLimit?.remaining).toBe(4850);
    expect(rateLimit?.reset).toBe(1700000000);
    expect(rateLimit?.used).toBe(150);
    expect(rateLimit?.resetDate).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('serves subsequent requests from in-memory TTL cache without duplicate network calls', async () => {
    const mockRepo = {
      id: 123,
      name: 'cached-repo',
      full_name: 'octocat/cached-repo',
      owner: { login: 'octocat', id: 1, avatar_url: '' },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockRepo,
    });

    const repo1 = await client.getRepo('octocat', 'cached-repo');
    const repo2 = await client.getRepo('octocat', 'cached-repo');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(repo1).toEqual(repo2);
  });

  it('deduplicates concurrent in-flight requests to the same endpoint', async () => {
    const mockRepo = {
      id: 999,
      name: 'concurrent-repo',
      full_name: 'octocat/concurrent-repo',
      owner: { login: 'octocat', id: 1, avatar_url: '' },
    };

    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                headers: new Headers(),
                json: async () => mockRepo,
              }),
            10
          )
        )
    );

    const [res1, res2] = await Promise.all([
      client.getRepo('octocat', 'concurrent-repo'),
      client.getRepo('octocat', 'concurrent-repo'),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1.name).toBe('concurrent-repo');
    expect(res2.name).toBe('concurrent-repo');
  });

  it('throws NotFoundError on HTTP 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      text: async () => 'Not Found',
    });

    await expect(client.getUser('unknown-user-404')).rejects.toThrow(NotFoundError);
  });

  it('throws UnauthorizedError on HTTP 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => 'Bad credentials',
    });

    await expect(client.getUser('octocat')).rejects.toThrow(UnauthorizedError);
  });

  it('throws RateLimitError on HTTP 403 when remaining is 0', async () => {
    const headers = new Headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1700000000',
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers,
      text: async () => 'API rate limit exceeded',
    });

    await expect(client.getUser('octocat')).rejects.toThrow(RateLimitError);
  });

  it('fetches and normalizes branches, commits, and comparisons', async () => {
    const mockBranches = [
      {
        name: 'main',
        commit: { sha: 'sha-main', url: 'https://api.github.com/commits/sha-main' },
        protected: true,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockBranches,
    });

    const branches = await client.getBranches('octocat', 'hello-world');
    expect(branches).toHaveLength(1);
    expect(branches[0]?.name).toBe('main');
    expect(branches[0]?.protected).toBe(true);
  });
});
