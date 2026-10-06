import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  listInvestigations,
  getInvestigation,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
  attachAIAnalysis,
  getInvestigationAnalyses,
} from '../controllers/investigationController.js';

export const investigationsRouter: Router = Router();

// All investigation endpoints require valid user authentication
investigationsRouter.use(requireAuth);

const idParamValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Investigation UUID identifier',
    },
  },
});

const listQueryValidation = validateRequest({
  query: {
    repositoryId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Optional filter by saved repository ID',
    },
  },
});

const createInvestigationValidation = validateRequest({
  body: {
    repositoryId: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Associated saved repository ID',
    },
    title: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Investigation title',
    },
    description: {
      type: 'string',
      maxLength: 5000,
      description: 'Investigation summary or goals',
    },
    context: {
      type: 'object',
      description: 'Context snapshot payload (branch, commits, diff, files)',
    },
  },
});

const updateInvestigationValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Investigation UUID identifier',
    },
  },
  body: {
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Investigation title',
    },
    description: {
      type: 'string',
      maxLength: 5000,
      description: 'Investigation summary or goals',
    },
    context: {
      type: 'object',
      description: 'Context snapshot payload',
    },
  },
});

const attachAnalysisValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Investigation UUID identifier',
    },
  },
  body: {
    type: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Analysis type (e.g. REPOSITORY_OVERVIEW, COMMIT_EXPLANATION, etc.)',
    },
  },
});

/**
 * GET /api/investigations
 * Lists investigations for authenticated user, with optional repositoryId filter.
 */
investigationsRouter.get('/', listQueryValidation, listInvestigations);

/**
 * GET /api/investigations/:id
 * Retrieves investigation details with repository association.
 */
investigationsRouter.get('/:id', idParamValidation, getInvestigation);

/**
 * POST /api/investigations
 * Creates a new investigation attached to a saved repository.
 */
investigationsRouter.post('/', createInvestigationValidation, createInvestigation);

/**
 * PUT /api/investigations/:id & PATCH /api/investigations/:id
 * Updates an investigation's metadata or context snapshot.
 */
investigationsRouter.put('/:id', updateInvestigationValidation, updateInvestigation);
investigationsRouter.patch('/:id', updateInvestigationValidation, updateInvestigation);

/**
 * DELETE /api/investigations/:id
 * Removes an investigation from user workspace.
 */
investigationsRouter.delete('/:id', idParamValidation, deleteInvestigation);

/**
 * POST /api/investigations/:id/analyses & /api/investigations/:id/ai-analyses
 * Attaches or links an AI analysis report to an existing investigation.
 */
investigationsRouter.post('/:id/analyses', attachAnalysisValidation, attachAIAnalysis);
investigationsRouter.post('/:id/ai-analyses', attachAnalysisValidation, attachAIAnalysis);

/**
 * GET /api/investigations/:id/analyses & /api/investigations/:id/ai-analyses
 * Retrieves all saved AI analysis records linked to an investigation.
 */
investigationsRouter.get('/:id/analyses', idParamValidation, getInvestigationAnalyses);
investigationsRouter.get('/:id/ai-analyses', idParamValidation, getInvestigationAnalyses);
