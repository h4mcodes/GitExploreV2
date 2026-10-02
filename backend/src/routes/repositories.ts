import { Router } from 'express';
import { validateRequest } from '../middleware/validation.js';
import {
  getRepositoryAnalysis,
  analyzeRepository,
} from '../controllers/repositoryController.js';

export const repositoriesRouter: Router = Router();

const repoParamsValidation = validateRequest({
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
});

const analyzeValidation = validateRequest({
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
    branch: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_.\-\/]+$/,
      description: 'Target branch name',
    },
  },
  body: {
    branch: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_.\-\/]+$/,
      description: 'Target branch name',
    },
  },
});

/**
 * GET /api/repositories/:owner/:repo/analysis
 * Returns cached repository intelligence analysis or 404 if not yet analyzed.
 */
repositoriesRouter.get('/:owner/:repo/analysis', repoParamsValidation, getRepositoryAnalysis);

/**
 * POST /api/repositories/:owner/:repo/analyze
 * Triggers and caches full repository intelligence analysis across DAG, statistics, divergence, file churn, and evolution.
 */
repositoriesRouter.post('/:owner/:repo/analyze', analyzeValidation, analyzeRepository);
