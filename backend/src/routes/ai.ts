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

const repoOverviewValidation = validateRequest({
  body: {
    owner: { type: 'string', maxLength: 100 },
    branch: { type: 'string', maxLength: 100 },
    repositoryId: { type: 'string', maxLength: 100 },
  },
});

const commitExplanationValidation = validateRequest({
  body: {
    owner: { type: 'string', maxLength: 100 },
    sha: { type: 'string', maxLength: 100 },
    commitSha: { type: 'string', maxLength: 100 },
    repositoryId: { type: 'string', maxLength: 100 },
  },
});

const diffReviewValidation = validateRequest({
  body: {
    owner: { type: 'string', maxLength: 100 },
    base: { type: 'string', maxLength: 100 },
    head: { type: 'string', maxLength: 100 },
    repositoryId: { type: 'string', maxLength: 100 },
  },
});

const branchAnalysisValidation = validateRequest({
  body: {
    owner: { type: 'string', maxLength: 100 },
    base: { type: 'string', maxLength: 100 },
    head: { type: 'string', maxLength: 100 },
    repositoryId: { type: 'string', maxLength: 100 },
  },
});

const repoHealthValidation = validateRequest({
  body: {
    owner: { type: 'string', maxLength: 100 },
    branch: { type: 'string', maxLength: 100 },
    repositoryId: { type: 'string', maxLength: 100 },
  },
});

// Provider health & status check
aiRouter.get('/status', getAIStatus);

// Universal analysis dispatcher
aiRouter.post('/analyze', analyzeValidation, postAnalyze);

// Dedicated feature endpoints
aiRouter.post('/repository-overview', repoOverviewValidation, postRepositoryOverview);
aiRouter.post('/commit-explanation', commitExplanationValidation, postCommitExplanation);
aiRouter.post('/diff-review', diffReviewValidation, postDiffReview);
aiRouter.post('/branch-analysis', branchAnalysisValidation, postBranchAnalysis);
aiRouter.post('/branch-comparison', branchAnalysisValidation, postBranchAnalysis); // Alias
aiRouter.post('/repository-health', repoHealthValidation, postRepositoryHealth);
aiRouter.post('/code-health', repoHealthValidation, postRepositoryHealth); // Alias
aiRouter.post('/repository-qa', postRepositoryQA);
aiRouter.post('/qa', postRepositoryQA); // Alias
