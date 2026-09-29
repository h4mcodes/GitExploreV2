import type { GithubUser } from '../types/github';

/**
 * Configuration options for backend API requests.
 */
export interface BackendRequestOptions {
  readonly bypassCache?: boolean;
  readonly ttlMs?: number;
  readonly signal?: AbortSignal;
}

/**
 * Structured error returned by backend API or network client.
 */
export class BackendApiError extends Error {
  constructor(
    public readonly kind: 'not-found' | 'rate-limit' | 'network' | 'validation' | 'unauthorized' | 'unexpected',
    public readonly status?: number,
    public readonly code?: string,
    public readonly rateLimitResetDate?: Date,
    message?: string,
    public readonly details?: unknown
  ) {
    super(message || `Backend API error (${kind}${status ? ` ${status}` : ''})`);
    this.name = 'BackendApiError';
  }
}

/**
 * Backend API Client for GitExplore V2.
 * Connects to the Express backend proxy service.
 */
export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
    this.baseUrl = (baseUrl || envUrl || '').replace(/\/+$/, '');
  }

  /**
   * Helper to perform typed GET requests against the backend.
   */
  public async get<T>(path: string, options?: BackendRequestOptions): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: options?.signal,
      });
    } catch (networkError) {
      throw new BackendApiError(
        'network',
        undefined,
        'NETWORK_ERROR',
        undefined,
        networkError instanceof Error ? networkError.message : 'Network connection failed'
      );
    }

    if (response.status === 404) {
      throw new BackendApiError('not-found', 404, 'GITHUB_NOT_FOUND', undefined, 'Resource not found');
    }

    if (response.status === 429 || response.status === 403) {
      let resetDate: Date | undefined;
      const resetHeader = response.headers.get('x-ratelimit-reset');
      if (resetHeader) {
        const timestamp = parseInt(resetHeader, 10);
        if (!isNaN(timestamp)) {
          resetDate = new Date(timestamp * 1000);
        }
      }
      throw new BackendApiError(
        'rate-limit',
        response.status,
        'GITHUB_RATE_LIMIT_EXCEEDED',
        resetDate,
        'GitHub API rate limit exceeded'
      );
    }

    if (!response.ok) {
      let errorBody: { error?: string; code?: string; details?: unknown } | null = null;
      try {
        errorBody = await response.json();
      } catch {
        // Non-JSON response
      }

      if (response.status === 400) {
        throw new BackendApiError(
          'validation',
          400,
          errorBody?.code || 'VALIDATION_ERROR',
          undefined,
          errorBody?.error || 'Validation error',
          errorBody?.details
        );
      }

      throw new BackendApiError(
        'unexpected',
        response.status,
        errorBody?.code || 'API_ERROR',
        undefined,
        errorBody?.error || `Request failed with HTTP status ${response.status}`
      );
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Fetches normalized GitHub user profile through the backend proxy.
   */
  public async getGithubUser(username: string, options?: BackendRequestOptions): Promise<GithubUser> {
    return this.get<GithubUser>(`/api/github/users/${encodeURIComponent(username.trim())}`, options);
  }
}

// Global API client singleton
export const apiClient = new ApiClient();
