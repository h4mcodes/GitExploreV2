import type { GithubUser } from '../types/github';
import type {
  AuthSession,
  AuthUser,
  WorkspaceOverview,
  SavedRepositoryItem,
  TagItem,
  InvestigationItem,
  AIAnalysisRecordItem,
  NoteItem,
  BookmarkItem,
} from '../types/workspace';
import type {
  AIAnalysisEnvelope,
  RepositoryOverviewData,
  CommitExplanationData,
  DiffReviewData,
  BranchAnalysisData,
  RepositoryHealthData,
  RepositoryQAData,
} from '../types/ai';

/**
 * Configuration options for backend API requests.
 */
export interface BackendRequestOptions {
  readonly bypassCache?: boolean;
  readonly ttlMs?: number;
  readonly signal?: AbortSignal;
  readonly token?: string;
}

/**
 * Structured error returned by backend API or network client.
 */
export class BackendApiError extends Error {
  constructor(
    public readonly kind: 'not-found' | 'rate-limit' | 'network' | 'validation' | 'unauthorized' | 'forbidden' | 'conflict' | 'unexpected',
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

const AUTH_STORAGE_KEY = 'gitexplore_v2_auth_session';

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
   * Reads stored authentication session from localStorage.
   */
  public getStoredAuth(): AuthSession | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as AuthSession;
    } catch {
      return null;
    }
  }

  /**
   * Persists authentication session into localStorage.
   */
  public setStoredAuth(session: AuthSession): void {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignored
    }
  }

  /**
   * Clears stored authentication session from localStorage.
   */
  public clearStoredAuth(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignored
    }
  }

  /**
   * Resolves the current auth token from options or localStorage.
   */
  private getAuthToken(options?: BackendRequestOptions): string | undefined {
    if (options?.token) return options.token;
    const session = this.getStoredAuth();
    return session?.token;
  }

  /**
   * Helper to perform HTTP requests against the backend.
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options?: BackendRequestOptions
  ): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getAuthToken(options);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
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

    if (response.status === 401) {
      throw new BackendApiError('unauthorized', 401, 'AUTH_REQUIRED', undefined, 'Authentication required');
    }

    if (response.status === 403) {
      throw new BackendApiError('forbidden', 403, 'FORBIDDEN', undefined, 'Access forbidden');
    }

    if (response.status === 404) {
      throw new BackendApiError('not-found', 404, 'NOT_FOUND', undefined, 'Resource not found');
    }

    if (response.status === 409) {
      let errorBody: { error?: string; code?: string } | null = null;
      try {
        errorBody = await response.json();
      } catch {
        // Non-JSON
      }
      throw new BackendApiError(
        'conflict',
        409,
        errorBody?.code || 'CONFLICT',
        undefined,
        errorBody?.error || 'Resource conflict'
      );
    }

    if (response.status === 429) {
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
        'RATE_LIMIT_EXCEEDED',
        resetDate,
        'Rate limit exceeded'
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
   * GET request
   */
  public async get<T>(path: string, options?: BackendRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST request
   */
  public async post<T>(path: string, body?: unknown, options?: BackendRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * PATCH request
   */
  public async patch<T>(path: string, body?: unknown, options?: BackendRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  /**
   * DELETE request
   */
  public async delete<T>(path: string, options?: BackendRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  // ==========================================
  // GitHub Proxy Endpoints
  // ==========================================

  public async getGithubUser(username: string, options?: BackendRequestOptions): Promise<GithubUser> {
    return this.get<GithubUser>(`/api/github/users/${encodeURIComponent(username.trim())}`, options);
  }

  // ==========================================
  // Authentication Endpoints
  // ==========================================

  public async login(credentials: { username: string; password?: string }): Promise<AuthSession> {
    const session = await this.post<AuthSession>('/api/auth/login', credentials);
    this.setStoredAuth(session);
    return session;
  }

  public async register(data: { username: string; password?: string; email?: string }): Promise<AuthSession> {
    const session = await this.post<AuthSession>('/api/auth/register', data);
    this.setStoredAuth(session);
    return session;
  }

  public async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } finally {
      this.clearStoredAuth();
    }
  }

  public async getMe(): Promise<AuthUser> {
    return this.get<AuthUser>('/api/auth/me');
  }

  // ==========================================
  // Workspace Endpoints
  // ==========================================

  public async getWorkspaceOverview(options?: BackendRequestOptions): Promise<WorkspaceOverview> {
    return this.get<WorkspaceOverview>('/api/workspace', options);
  }

  public async getSavedRepositories(options?: BackendRequestOptions): Promise<SavedRepositoryItem[]> {
    return this.get<SavedRepositoryItem[]>('/api/workspace/repositories', options);
  }

  public async saveRepository(
    repo: {
      owner: string;
      name: string;
      fullName?: string;
      description?: string | null;
      language?: string | null;
      stars?: number;
      forks?: number;
      defaultBranch?: string;
    },
    options?: BackendRequestOptions
  ): Promise<SavedRepositoryItem> {
    return this.post<SavedRepositoryItem>('/api/workspace/repositories', repo, options);
  }

  public async deleteSavedRepository(
    id: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; id: string }> {
    return this.delete<{ message: string; id: string }>(`/api/workspace/repositories/${id}`, options);
  }

  // ==========================================
  // Tags Endpoints
  // ==========================================

  public async getTags(options?: BackendRequestOptions): Promise<TagItem[]> {
    return this.get<TagItem[]>('/api/workspace/tags', options);
  }

  public async createTag(
    data: { name: string; color?: string },
    options?: BackendRequestOptions
  ): Promise<TagItem> {
    return this.post<TagItem>('/api/workspace/tags', data, options);
  }

  public async deleteTag(
    id: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; id: string }> {
    return this.delete<{ message: string; id: string }>(`/api/workspace/tags/${id}`, options);
  }

  public async assignTagToRepository(
    repoId: string,
    tagId: string,
    options?: BackendRequestOptions
  ): Promise<unknown> {
    return this.post(`/api/workspace/repositories/${repoId}/tags`, { tagId }, options);
  }

  public async removeTagFromRepository(
    repoId: string,
    tagId: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; repositoryId: string; tagId: string }> {
    return this.delete<{ message: string; repositoryId: string; tagId: string }>(
      `/api/workspace/repositories/${repoId}/tags/${tagId}`,
      options
    );
  }

  // ==========================================
  // Investigations Endpoints
  // ==========================================

  public async getInvestigations(
    repositoryId?: string,
    options?: BackendRequestOptions
  ): Promise<InvestigationItem[]> {
    const query = repositoryId ? `?repositoryId=${encodeURIComponent(repositoryId)}` : '';
    return this.get<InvestigationItem[]>(`/api/investigations${query}`, options);
  }

  public async createInvestigation(
    data: { repositoryId: string; title: string; description?: string; context?: Record<string, unknown> },
    options?: BackendRequestOptions
  ): Promise<InvestigationItem> {
    return this.post<InvestigationItem>('/api/investigations', data, options);
  }

  public async deleteInvestigation(
    id: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; id: string }> {
    return this.delete<{ message: string; id: string }>(`/api/investigations/${id}`, options);
  }

  public async attachAIAnalysisToInvestigation(
    id: string,
    analysis: {
      type: string;
      data: unknown;
      title?: string;
      summary?: string;
      modelId?: string;
      provider?: string;
      analysisId?: string;
      contextHash?: string;
    },
    options?: BackendRequestOptions
  ): Promise<InvestigationItem> {
    return this.post<InvestigationItem>(`/api/investigations/${id}/analyses`, analysis, options);
  }

  public async getInvestigationAnalyses(
    id: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisRecordItem[]> {
    return this.get<AIAnalysisRecordItem[]>(`/api/investigations/${id}/analyses`, options);
  }

  // ==========================================
  // Notes Endpoints
  // ==========================================

  public async getNotes(
    filters?: { repositoryId?: string; investigationId?: string; targetType?: string; targetRef?: string },
    options?: BackendRequestOptions
  ): Promise<NoteItem[]> {
    const params = new URLSearchParams();
    if (filters?.repositoryId) params.append('repositoryId', filters.repositoryId);
    if (filters?.investigationId) params.append('investigationId', filters.investigationId);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.targetRef) params.append('targetRef', filters.targetRef);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get<NoteItem[]>(`/api/notes${query}`, options);
  }

  public async createNote(
    data: {
      content: string;
      targetType: string;
      targetRef: string;
      repositoryId?: string;
      investigationId?: string;
    },
    options?: BackendRequestOptions
  ): Promise<NoteItem> {
    return this.post<NoteItem>('/api/notes', data, options);
  }

  public async deleteNote(
    id: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; id: string }> {
    return this.delete<{ message: string; id: string }>(`/api/notes/${id}`, options);
  }

  // ==========================================
  // Bookmarks Endpoints
  // ==========================================

  public async getBookmarks(
    filters?: { repositoryId?: string; targetType?: string; targetRef?: string },
    options?: BackendRequestOptions
  ): Promise<BookmarkItem[]> {
    const params = new URLSearchParams();
    if (filters?.repositoryId) params.append('repositoryId', filters.repositoryId);
    if (filters?.targetType) params.append('targetType', filters.targetType);
    if (filters?.targetRef) params.append('targetRef', filters.targetRef);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get<BookmarkItem[]>(`/api/bookmarks${query}`, options);
  }

  public async createBookmark(
    data: {
      repositoryId: string;
      label: string;
      targetType: string;
      targetRef: string;
    },
    options?: BackendRequestOptions
  ): Promise<BookmarkItem> {
    return this.post<BookmarkItem>('/api/bookmarks', data, options);
  }

  public async deleteBookmark(
    id: string,
    options?: BackendRequestOptions
  ): Promise<{ message: string; id: string }> {
    return this.delete<{ message: string; id: string }>(`/api/bookmarks/${id}`, options);
  }

  // ==========================================
  // AI Analysis Endpoints (D7-P1 to D7-P5)
  // ==========================================

  public async fetchRepositoryOverview(
    owner: string,
    repo: string,
    branch?: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisEnvelope<RepositoryOverviewData>> {
    return this.post<AIAnalysisEnvelope<RepositoryOverviewData>>(
      '/api/ai/repository-overview',
      { owner, repo, branch, bypassCache: options?.bypassCache },
      options
    );
  }

  public async fetchCommitExplanation(
    owner: string,
    repo: string,
    sha: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisEnvelope<CommitExplanationData>> {
    return this.post<AIAnalysisEnvelope<CommitExplanationData>>(
      '/api/ai/commit-explanation',
      { owner, repo, sha, bypassCache: options?.bypassCache },
      options
    );
  }

  public async fetchDiffReview(
    owner: string,
    repo: string,
    base: string,
    head: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisEnvelope<DiffReviewData>> {
    return this.post<AIAnalysisEnvelope<DiffReviewData>>(
      '/api/ai/diff-review',
      { owner, repo, base, head, bypassCache: options?.bypassCache },
      options
    );
  }

  public async fetchBranchAnalysis(
    owner: string,
    repo: string,
    base: string,
    head: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisEnvelope<BranchAnalysisData>> {
    return this.post<AIAnalysisEnvelope<BranchAnalysisData>>(
      '/api/ai/branch-analysis',
      { owner, repo, base, head, bypassCache: options?.bypassCache },
      options
    );
  }

  public async fetchRepositoryHealth(
    owner: string,
    repo: string,
    branch?: string,
    options?: BackendRequestOptions
  ): Promise<AIAnalysisEnvelope<RepositoryHealthData>> {
    return this.post<AIAnalysisEnvelope<RepositoryHealthData>>(
      '/api/ai/repository-health',
      { owner, repo, branch, bypassCache: options?.bypassCache },
      options
    );
  }

  public async askRepositoryQA(
    owner: string,
    repo: string,
    question: string,
    options?: BackendRequestOptions & { branch?: string; focusedContext?: Record<string, unknown> }
  ): Promise<AIAnalysisEnvelope<RepositoryQAData>> {
    return this.post<AIAnalysisEnvelope<RepositoryQAData>>(
      '/api/ai/repository-qa',
      {
        owner,
        repo,
        question,
        branch: options?.branch,
        focusedContext: options?.focusedContext,
        bypassCache: options?.bypassCache,
      },
      options
    );
  }
}

// Global API client singleton
export const apiClient = new ApiClient();
