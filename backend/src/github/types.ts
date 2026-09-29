// GitHub REST API v3 Types for GitExplore V2 Backend
// Reference: https://docs.github.com/en/rest

export interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
  readonly used: number;
  readonly resetDate: string;
}

export interface GithubApiUser {
  readonly login: string;
  readonly id: number;
  readonly avatar_url: string;
  readonly html_url: string;
  readonly name: string | null;
  readonly company: string | null;
  readonly blog: string | null;
  readonly location: string | null;
  readonly email: string | null;
  readonly bio: string | null;
  readonly public_repos: number;
  readonly followers: number;
  readonly following: number;
  readonly created_at: string;
  readonly updated_at?: string;
}

export interface GithubApiRepo {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly owner: {
    readonly login: string;
    readonly id: number;
    readonly avatar_url: string;
  };
  readonly private: boolean;
  readonly html_url: string;
  readonly description: string | null;
  readonly fork: boolean;
  readonly url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string | null;
  readonly homepage: string | null;
  readonly size: number;
  readonly stargazers_count: number;
  readonly watchers_count: number;
  readonly language: string | null;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly default_branch: string;
  readonly visibility?: string;
}

export interface GithubApiBranch {
  readonly name: string;
  readonly commit: {
    readonly sha: string;
    readonly url: string;
  };
  readonly protected: boolean;
}

export interface GithubApiCommitParent {
  readonly sha: string;
  readonly url: string;
  readonly html_url?: string;
}

export interface GithubApiCommitSummary {
  readonly sha: string;
  readonly node_id?: string;
  readonly html_url: string;
  readonly commit: {
    readonly author: {
      readonly name: string;
      readonly email: string;
      readonly date: string;
    } | null;
    readonly committer: {
      readonly name: string;
      readonly email: string;
      readonly date: string;
    } | null;
    readonly message: string;
    readonly comment_count: number;
  };
  readonly author: {
    readonly login: string;
    readonly id: number;
    readonly avatar_url: string;
    readonly html_url: string;
  } | null;
  readonly committer: {
    readonly login: string;
    readonly id: number;
    readonly avatar_url: string;
    readonly html_url: string;
  } | null;
  readonly parents: readonly GithubApiCommitParent[];
}

export interface GithubApiCommitFile {
  readonly sha?: string;
  readonly filename: string;
  readonly status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
  readonly blob_url?: string;
  readonly raw_url?: string;
  readonly contents_url?: string;
  readonly patch?: string;
  readonly previous_filename?: string;
}

export interface GithubApiCommitDetail extends GithubApiCommitSummary {
  readonly stats?: {
    readonly total: number;
    readonly additions: number;
    readonly deletions: number;
  };
  readonly files?: readonly GithubApiCommitFile[];
}

export interface GithubApiComparison {
  readonly url: string;
  readonly html_url: string;
  readonly permalink_url: string;
  readonly diff_url: string;
  readonly patch_url: string;
  readonly base_commit: GithubApiCommitSummary;
  readonly merge_base_commit: GithubApiCommitSummary;
  readonly status: 'ahead' | 'behind' | 'identical' | 'diverged';
  readonly ahead_by: number;
  readonly behind_by: number;
  readonly total_commits: number;
  readonly commits: readonly GithubApiCommitSummary[];
  readonly files: readonly GithubApiCommitFile[];
}

export interface GithubClientConfig {
  readonly token?: string;
  readonly baseUrl?: string;
  readonly defaultTtlMs?: number;
}
