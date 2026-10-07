import { Router } from 'express';
import { validateRequest } from '../middleware/validation.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import {
  getAIStatus,
  postAnalyze,
  postRepositoryOverview,
  postCommitExplanation,
  postDiffReview,
  postBranchAnalysis,
  postRepositoryHealth,
  postRepositoryQA,
} from '../controllers/aiController.js';

export const aiRouter: Router = Router();

// Apply AI rate limiter to all AI routes
aiRouter.use(aiRateLimiter);

const validAnalysisTypes = [
  'REPOSITORY_OVERVIEW',
  'COMMIT_EXPLANATION',
  'DIFF_REVIEW',
  'BRANCH_ANALYSIS',
  'REPOSITORY_HEALTH',
  'REPOSITORY_QA',
  'CUSTOM',
];

const analyzeValidation = validateRequest({
  body: {
    type: {
      required: true,
      type: 'string',
      custom: (val) =>
        validAnalysisTypes.includes(val as string) ||
        `Invalid analysis type '${String(val)}'. Supported: ${validAnalysisTypes.join(', ')}`,
    },
  },
});

// Provider health & status check
aiRouter.get('/status', getAIStatus);

// Universal analysis dispatcher
aiRouter.post('/analyze', analyzeValidation, postAnalyze);

// Dedicated feature endpoints
aiRouter.post('/repository-overview', postRepositoryOverview);
aiRouter.post('/commit-explanation', postCommitExplanation);
aiRouter.post('/diff-review', postDiffReview);
aiRouter.post('/branch-analysis', postBranchAnalysis);
aiRouter.post('/branch-comparison', postBranchAnalysis); // Alias
aiRouter.post('/repository-health', postRepositoryHealth);
aiRouter.post('/code-health', postRepositoryHealth); // Alias
aiRouter.post('/repository-qa', postRepositoryQA);
aiRouter.post('/qa', postRepositoryQA); // Alias
