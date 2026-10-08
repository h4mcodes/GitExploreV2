import { env } from '../config/env.js';
import {
  GithubApiUser,
  GithubApiRepo,
  GithubApiBranch,
  GithubApiCommitSummary,
  GithubApiCommitDetail,
  GithubApiComparison,
  GithubClientConfig,
  RateLimitInfo,
} from './types.js';
import {
  normalizeUser,
  normalizeRepo,
  normalizeBranch,
  normalizeCommitSummary,
  normalizeCommitDetail,
  normalizeComparison,
} from './normalizer.js';
import {
  AppError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
} from '../types/api.js';

interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}

export class GithubClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly defaultTtlMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private latestRateLimit: RateLimitInfo | null = null;
  private readonly maxCacheSize: number = 500;

  constructor(config: GithubClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
    this.token = config.token ?? env.githubToken;
    this.defaultTtlMs = config.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Returns the most recent rate limit information tracked from response headers.
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    return this.latestRateLimit;
  }

  /**
   * Clears all in-memory cached responses and in-flight promises.
   */
  public clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  /**
   * Internal authenticated fetch wrapper with in-memory caching and deduplication.
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    ttlMs: number = this.defaultTtlMs
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const cacheKey = url.toString();
    const now = Date.now();

    // Check existing valid cache entry
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }

    // Check in-flight promise deduplication
    const activePromise = this.inFlight.get(cacheKey);
    if (activePromise) {
      return activePromise as Promise<T>;
    }

    const fetchPromise = (async (): Promise<T> => {
      try {
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitExplore-V2-Backend',
        };

        if (this.token && this.token.trim().length > 0) {
          headers['Authorization'] = `Bearer ${this.token.trim()}`;
        }

        let response: Response;
        try {
          response = await fetch(url.toString(), {
            method: 'GET',
            headers,
          });
        } catch (fetchErr: unknown) {
          throw new AppError(
            `GitHub API service is unreachable: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
            503,
            'GITHUB_SERVICE_UNAVAILABLE',
            { endpoint }
          );
        }

        this.extractRateLimitHeaders(response.headers);

        if (!response.ok) {
          await this.handleErrorResponse(response, endpoint);
        }

        const json = await response.json();

        // Evict oldest entries if cache exceeds max capacity
        if (this.cache.size >= this.maxCacheSize) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
          }
        }

        this.cache.set(cacheKey, {
          data: json,
          expiresAt: now + ttlMs,
        });

        return json as T;
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private extractRateLimitHeaders(headers: Headers): void {
    const limitHeader = headers.get('x-ratelimit-limit');
    const remainingHeader = headers.get('x-ratelimit-remaining');
    const resetHeader = headers.get('x-ratelimit-reset');
    const usedHeader = headers.get('x-ratelimit-used');

    if (limitHeader && remainingHeader && resetHeader) {
      const limit = parseInt(limitHeader, 10);
      const remaining = parseInt(remainingHeader, 10);
      const reset = parseInt(resetHeader, 10);
      const used = usedHeader ? parseInt(usedHeader, 10) : limit - remaining;
      const resetDate = new Date(reset * 1000).toISOString();

      this.latestRateLimit = {
        limit: isNaN(limit) ? 0 : limit,
        remaining: isNaN(remaining) ? 0 : remaining,
        reset: isNaN(reset) ? 0 : reset,
        used: isNaN(used) ? 0 : used,
        resetDate,
      };
    }
  }

  private async handleErrorResponse(response: Response, endpoint: string): Promise<never> {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // Ignored
    }

    if (response.status === 404) {
      throw new NotFoundError(`GitHub resource not found at ${endpoint}`, 'GITHUB_NOT_FOUND');
    }

    if (response.status === 401) {
      throw new UnauthorizedError('Invalid or expired GitHub authentication token', 'GITHUB_UNAUTHORIZED');
    }

    if (response.status === 403) {
      if (this.latestRateLimit && this.latestRateLimit.remaining === 0) {
        throw new RateLimitError(
          `GitHub API rate limit exceeded. Resets at ${this.latestRateLimit.resetDate}`,
          'GITHUB_RATE_LIMIT_EXCEEDED'
        );
      }
      throw new ForbiddenError('Access to GitHub resource forbidden', 'GITHUB_FORBIDDEN');
    }

    if (response.status === 429) {
      throw new RateLimitError('GitHub API rate limit reached (HTTP 429)', 'GITHUB_RATE_LIMIT_EXCEEDED');
    }

    throw new AppError(
      `GitHub API request failed with status ${response.status}`,
      response.status >= 500 ? 502 : response.status,
      'GITHUB_API_ERROR',
      { status: response.status, body: errorBody }
    );
  }

  /**
   * Fetches user profile metadata by username.
   */
  public async getUser(username: string): Promise<GithubApiUser> {
    const raw = await this.request<unknown>(`/users/${encodeURIComponent(username)}`);
    return normalizeUser(raw);
  }

  /**
   * Fetches public repositories for a given username with sorting and pagination.
   */
  public async getUserRepos(
    username: string,
    options?: { page?: number; per_page?: number; sort?: string; direction?: string }
  ): Promise<GithubApiRepo[]> {
    const raw = await this.request<unknown[]>(`/users/${encodeURIComponent(username)}/repos`, {
      page: options?.page ?? 1,
      per_page: options?.per_page ?? 100,
      sort: options?.sort ?? 'updated',
      direction: options?.direction ?? 'desc',
    });

    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(normalizeRepo);
  }

  /**
   * Fetches repository metadata for an owner and repo name.
   */
  public async getRepo(owner: string, repo: string): Promise<GithubApiRepo> {
    const raw = await this.request<unknown>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );
    return normalizeRepo(raw);
  }

  /**
   * Fetches branches of a repository.
   */
  public async getBranches(
    owner: string,
    repo: string,
    options?: { page?: number; per_page?: number }
  ): Promise<GithubApiBranch[]> {
    const raw = await this.request<unknown[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
      {
        page: options?.page ?? 1,
        per_page: options?.per_page ?? 100,
      }
    );

    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(normalizeBranch);
  }

  /**
   * Fetches commits list for a repository/branch.
   */
  public async getCommits(
    owner: string,
    repo: string,
    options?: { sha?: string; page?: number; per_page?: number }
  ): Promise<GithubApiCommitSummary[]> {
    const raw = await this.request<unknown[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
      {
        sha: options?.sha,
        page: options?.page ?? 1,
        per_page: options?.per_page ?? 30,
      }
    );

    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(normalizeCommitSummary);
  }

  /**
   * Fetches single commit detail with patch and file diffs.
   */
  public async getCommit(owner: string, repo: string, ref: string): Promise<GithubApiCommitDetail> {
    const raw = await this.request<unknown>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`
    );
    return normalizeCommitDetail(raw);
  }

  /**
   * Compares two commits or branch heads.
   */
  public async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<GithubApiComparison> {
    const raw = await this.request<unknown>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`
    );
    return normalizeComparison(raw);
  }
}

// Global singleton client configured with environment token
export const githubClient = new GithubClient();
