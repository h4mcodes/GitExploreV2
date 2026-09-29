import {
  GithubApiUser,
  GithubApiRepo,
  GithubApiBranch,
  GithubApiCommitSummary,
  GithubApiCommitDetail,
  GithubApiCommitFile,
  GithubApiComparison,
} from './types.js';
import { BadRequestError } from '../types/api.js';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function normalizeUser(raw: unknown): GithubApiUser {
  if (!isObject(raw) || typeof raw['login'] !== 'string') {
    throw new BadRequestError('Invalid user payload received from GitHub API');
  }

  return {
    login: raw['login'],
    id: typeof raw['id'] === 'number' ? raw['id'] : 0,
    avatar_url: typeof raw['avatar_url'] === 'string' ? raw['avatar_url'] : '',
    html_url: typeof raw['html_url'] === 'string' ? raw['html_url'] : '',
    name: typeof raw['name'] === 'string' ? raw['name'] : null,
    company: typeof raw['company'] === 'string' ? raw['company'] : null,
    blog: typeof raw['blog'] === 'string' ? raw['blog'] : null,
    location: typeof raw['location'] === 'string' ? raw['location'] : null,
    email: typeof raw['email'] === 'string' ? raw['email'] : null,
    bio: typeof raw['bio'] === 'string' ? raw['bio'] : null,
    public_repos: typeof raw['public_repos'] === 'number' ? raw['public_repos'] : 0,
    followers: typeof raw['followers'] === 'number' ? raw['followers'] : 0,
    following: typeof raw['following'] === 'number' ? raw['following'] : 0,
    created_at: typeof raw['created_at'] === 'string' ? raw['created_at'] : new Date().toISOString(),
    updated_at: typeof raw['updated_at'] === 'string' ? raw['updated_at'] : undefined,
  };
}

export function normalizeRepo(raw: unknown): GithubApiRepo {
  if (!isObject(raw) || typeof raw['name'] !== 'string' || typeof raw['full_name'] !== 'string') {
    throw new BadRequestError('Invalid repository payload received from GitHub API');
  }

  const ownerRaw = isObject(raw['owner']) ? raw['owner'] : {};

  return {
    id: typeof raw['id'] === 'number' ? raw['id'] : 0,
    name: raw['name'],
    full_name: raw['full_name'],
    owner: {
      login: typeof ownerRaw['login'] === 'string' ? ownerRaw['login'] : '',
      id: typeof ownerRaw['id'] === 'number' ? ownerRaw['id'] : 0,
      avatar_url: typeof ownerRaw['avatar_url'] === 'string' ? ownerRaw['avatar_url'] : '',
    },
    private: Boolean(raw['private']),
    html_url: typeof raw['html_url'] === 'string' ? raw['html_url'] : '',
    description: typeof raw['description'] === 'string' ? raw['description'] : null,
    fork: Boolean(raw['fork']),
    url: typeof raw['url'] === 'string' ? raw['url'] : '',
    created_at: typeof raw['created_at'] === 'string' ? raw['created_at'] : new Date().toISOString(),
    updated_at: typeof raw['updated_at'] === 'string' ? raw['updated_at'] : new Date().toISOString(),
    pushed_at: typeof raw['pushed_at'] === 'string' ? raw['pushed_at'] : null,
    homepage: typeof raw['homepage'] === 'string' ? raw['homepage'] : null,
    size: typeof raw['size'] === 'number' ? raw['size'] : 0,
    stargazers_count: typeof raw['stargazers_count'] === 'number' ? raw['stargazers_count'] : 0,
    watchers_count: typeof raw['watchers_count'] === 'number' ? raw['watchers_count'] : 0,
    language: typeof raw['language'] === 'string' ? raw['language'] : null,
    forks_count: typeof raw['forks_count'] === 'number' ? raw['forks_count'] : 0,
    open_issues_count: typeof raw['open_issues_count'] === 'number' ? raw['open_issues_count'] : 0,
    default_branch: typeof raw['default_branch'] === 'string' ? raw['default_branch'] : 'main',
    visibility: typeof raw['visibility'] === 'string' ? raw['visibility'] : undefined,
  };
}

export function normalizeBranch(raw: unknown): GithubApiBranch {
  if (!isObject(raw) || typeof raw['name'] !== 'string') {
    throw new BadRequestError('Invalid branch payload received from GitHub API');
  }

  const commitRaw = isObject(raw['commit']) ? raw['commit'] : {};

  return {
    name: raw['name'],
    commit: {
      sha: typeof commitRaw['sha'] === 'string' ? commitRaw['sha'] : '',
      url: typeof commitRaw['url'] === 'string' ? commitRaw['url'] : '',
    },
    protected: Boolean(raw['protected']),
  };
}

export function normalizeCommitSummary(raw: unknown): GithubApiCommitSummary {
  if (!isObject(raw) || typeof raw['sha'] !== 'string') {
    throw new BadRequestError('Invalid commit summary payload received from GitHub API');
  }

  const commitObj = isObject(raw['commit']) ? raw['commit'] : {};
  const authorObj = isObject(commitObj['author']) ? commitObj['author'] : null;
  const committerObj = isObject(commitObj['committer']) ? commitObj['committer'] : null;
  const authorUser = isObject(raw['author']) ? raw['author'] : null;
  const committerUser = isObject(raw['committer']) ? raw['committer'] : null;
  const rawParents = Array.isArray(raw['parents']) ? raw['parents'] : [];

  return {
    sha: raw['sha'],
    node_id: typeof raw['node_id'] === 'string' ? raw['node_id'] : undefined,
    html_url: typeof raw['html_url'] === 'string' ? raw['html_url'] : '',
    commit: {
      author: authorObj
        ? {
            name: typeof authorObj['name'] === 'string' ? authorObj['name'] : 'Unknown',
            email: typeof authorObj['email'] === 'string' ? authorObj['email'] : '',
            date: typeof authorObj['date'] === 'string' ? authorObj['date'] : new Date().toISOString(),
          }
        : null,
      committer: committerObj
        ? {
            name: typeof committerObj['name'] === 'string' ? committerObj['name'] : 'Unknown',
            email: typeof committerObj['email'] === 'string' ? committerObj['email'] : '',
            date: typeof committerObj['date'] === 'string' ? committerObj['date'] : new Date().toISOString(),
          }
        : null,
      message: typeof commitObj['message'] === 'string' ? commitObj['message'] : '',
      comment_count: typeof commitObj['comment_count'] === 'number' ? commitObj['comment_count'] : 0,
    },
    author: authorUser
      ? {
          login: typeof authorUser['login'] === 'string' ? authorUser['login'] : '',
          id: typeof authorUser['id'] === 'number' ? authorUser['id'] : 0,
          avatar_url: typeof authorUser['avatar_url'] === 'string' ? authorUser['avatar_url'] : '',
          html_url: typeof authorUser['html_url'] === 'string' ? authorUser['html_url'] : '',
        }
      : null,
    committer: committerUser
      ? {
          login: typeof committerUser['login'] === 'string' ? committerUser['login'] : '',
          id: typeof committerUser['id'] === 'number' ? committerUser['id'] : 0,
          avatar_url: typeof committerUser['avatar_url'] === 'string' ? committerUser['avatar_url'] : '',
          html_url: typeof committerUser['html_url'] === 'string' ? committerUser['html_url'] : '',
        }
      : null,
    parents: rawParents.map((p) => {
      const parentObj = isObject(p) ? p : {};
      return {
        sha: typeof parentObj['sha'] === 'string' ? parentObj['sha'] : '',
        url: typeof parentObj['url'] === 'string' ? parentObj['url'] : '',
        html_url: typeof parentObj['html_url'] === 'string' ? parentObj['html_url'] : undefined,
      };
    }),
  };
}

export function normalizeCommitFile(raw: unknown): GithubApiCommitFile {
  if (!isObject(raw) || typeof raw['filename'] !== 'string') {
    throw new BadRequestError('Invalid commit file payload received from GitHub API');
  }

  const validStatuses = ['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged'] as const;
  const statusRaw = typeof raw['status'] === 'string' ? raw['status'] : 'modified';
  const status = validStatuses.includes(statusRaw as (typeof validStatuses)[number])
    ? (statusRaw as (typeof validStatuses)[number])
    : 'modified';

  return {
    sha: typeof raw['sha'] === 'string' ? raw['sha'] : undefined,
    filename: raw['filename'],
    status,
    additions: typeof raw['additions'] === 'number' ? raw['additions'] : 0,
    deletions: typeof raw['deletions'] === 'number' ? raw['deletions'] : 0,
    changes: typeof raw['changes'] === 'number' ? raw['changes'] : 0,
    blob_url: typeof raw['blob_url'] === 'string' ? raw['blob_url'] : undefined,
    raw_url: typeof raw['raw_url'] === 'string' ? raw['raw_url'] : undefined,
    contents_url: typeof raw['contents_url'] === 'string' ? raw['contents_url'] : undefined,
    patch: typeof raw['patch'] === 'string' ? raw['patch'] : undefined,
    previous_filename: typeof raw['previous_filename'] === 'string' ? raw['previous_filename'] : undefined,
  };
}

export function normalizeCommitDetail(raw: unknown): GithubApiCommitDetail {
  const summary = normalizeCommitSummary(raw);
  if (!isObject(raw)) {
    return summary;
  }

  const statsObj = isObject(raw['stats']) ? raw['stats'] : undefined;
  const stats = statsObj
    ? {
        total: typeof statsObj['total'] === 'number' ? statsObj['total'] : 0,
        additions: typeof statsObj['additions'] === 'number' ? statsObj['additions'] : 0,
        deletions: typeof statsObj['deletions'] === 'number' ? statsObj['deletions'] : 0,
      }
    : undefined;

  const rawFiles = Array.isArray(raw['files']) ? raw['files'] : undefined;
  const files = rawFiles ? rawFiles.map(normalizeCommitFile) : undefined;

  return {
    ...summary,
    stats,
    files,
  };
}

export function normalizeComparison(raw: unknown): GithubApiComparison {
  if (!isObject(raw) || typeof raw['url'] !== 'string') {
    throw new BadRequestError('Invalid commit comparison payload received from GitHub API');
  }

  const validStatuses = ['ahead', 'behind', 'identical', 'diverged'] as const;
  const statusRaw = typeof raw['status'] === 'string' ? raw['status'] : 'identical';
  const status = validStatuses.includes(statusRaw as (typeof validStatuses)[number])
    ? (statusRaw as (typeof validStatuses)[number])
    : 'identical';

  const rawCommits = Array.isArray(raw['commits']) ? raw['commits'] : [];
  const rawFiles = Array.isArray(raw['files']) ? raw['files'] : [];

  return {
    url: raw['url'],
    html_url: typeof raw['html_url'] === 'string' ? raw['html_url'] : '',
    permalink_url: typeof raw['permalink_url'] === 'string' ? raw['permalink_url'] : '',
    diff_url: typeof raw['diff_url'] === 'string' ? raw['diff_url'] : '',
    patch_url: typeof raw['patch_url'] === 'string' ? raw['patch_url'] : '',
    base_commit: normalizeCommitSummary(raw['base_commit']),
    merge_base_commit: normalizeCommitSummary(raw['merge_base_commit']),
    status,
    ahead_by: typeof raw['ahead_by'] === 'number' ? raw['ahead_by'] : 0,
    behind_by: typeof raw['behind_by'] === 'number' ? raw['behind_by'] : 0,
    total_commits: typeof raw['total_commits'] === 'number' ? raw['total_commits'] : rawCommits.length,
    commits: rawCommits.map(normalizeCommitSummary),
    files: rawFiles.map(normalizeCommitFile),
  };
}
