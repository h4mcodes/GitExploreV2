import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  getWorkspaceOverview,
  getSavedRepositories,
  saveRepository,
  deleteSavedRepository,
} from '../controllers/workspaceController.js';

export const workspaceRouter: Router = Router();

// All workspace endpoints require valid user authentication
workspaceRouter.use(requireAuth);

const saveRepoValidation = validateRequest({
  body: {
    owner: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'Repository owner username/organization',
    },
    name: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_.-]+$/,
      description: 'Repository name',
    },
    fullName: {
      type: 'string',
      minLength: 3,
      maxLength: 150,
      description: 'Full repository identifier (owner/name)',
    },
    description: {
      type: 'string',
      maxLength: 5000,
      description: 'Repository description',
    },
    language: {
      type: 'string',
      maxLength: 100,
      description: 'Primary programming language',
    },
    stars: {
      type: 'number',
      min: 0,
      description: 'Stargazer count',
    },
    forks: {
      type: 'number',
      min: 0,
      description: 'Fork count',
    },
    defaultBranch: {
      type: 'string',
      maxLength: 100,
      description: 'Default branch name',
    },
  },
});

const deleteRepoValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Saved repository ID',
    },
  },
});

/**
 * GET /api/workspace
 * Returns workspace metrics, recent saved repos, and activity summary.
 */
workspaceRouter.get('/', getWorkspaceOverview);

/**
 * GET /api/workspace/repositories
 * Lists all saved repositories in user workspace.
 */
workspaceRouter.get('/repositories', getSavedRepositories);

/**
 * POST /api/workspace/repositories
 * Adds a repository to user's workspace.
 */
workspaceRouter.post('/repositories', saveRepoValidation, saveRepository);

/**
 * DELETE /api/workspace/repositories/:id
 * Removes a saved repository by ID from workspace.
 */
workspaceRouter.delete('/repositories/:id', deleteRepoValidation, deleteSavedRepository);
