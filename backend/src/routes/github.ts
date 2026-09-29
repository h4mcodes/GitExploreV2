import { Router } from 'express';
import { validateRequest } from '../middleware/validation.js';
import {
  getUserProfile,
  getUserRepositories,
  getRepositoryBranches,
} from '../controllers/githubController.js';

export const githubRouter: Router = Router();

// Validation schema for GitHub username parameter (1-39 chars, alphanumeric with single hyphens)
const usernameValidation = validateRequest({
  params: {
    username: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'GitHub username',
    },
  },
});

const userReposValidation = validateRequest({
  params: {
    username: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'GitHub username',
    },
  },
  query: {
    page: {
      type: 'string',
      pattern: /^[1-9]\d*$/,
      description: 'Page number',
    },
    per_page: {
      type: 'string',
      pattern: /^([1-9]|[1-9]\d|100)$/,
      description: 'Results per page (1-100)',
    },
    sort: {
      type: 'string',
      pattern: /^(created|updated|pushed|full_name)$/,
      description: 'Sort field',
    },
    direction: {
      type: 'string',
      pattern: /^(asc|desc)$/,
      description: 'Sort direction',
    },
  },
});

const repoBranchesValidation = validateRequest({
  params: {
    owner: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'Repository owner',
    },
    repo: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_.-]+$/,
      description: 'Repository name',
    },
  },
  query: {
    page: {
      type: 'string',
      pattern: /^[1-9]\d*$/,
      description: 'Page number',
    },
    per_page: {
      type: 'string',
      pattern: /^([1-9]|[1-9]\d|100)$/,
      description: 'Results per page (1-100)',
    },
  },
});

/**
 * GET /api/github/users/:username
 * Fetches normalized GitHub user profile.
 */
githubRouter.get('/users/:username', usernameValidation, getUserProfile);

/**
 * GET /api/github/users/:username/repos
 * Fetches public repositories for a given user with sorting & pagination.
 */
githubRouter.get('/users/:username/repos', userReposValidation, getUserRepositories);

/**
 * GET /api/github/repos/:owner/:repo/branches
 * Fetches branches of a repository.
 */
githubRouter.get('/repos/:owner/:repo/branches', repoBranchesValidation, getRepositoryBranches);
