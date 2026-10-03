import type { AnalysisType } from '../types.js';
import {
  REPOSITORY_OVERVIEW_PROMPT_VERSION,
  REPOSITORY_OVERVIEW_SYSTEM_INSTRUCTION,
  buildRepositoryOverviewPrompt,
  type PromptResult,
} from './repositoryOverview.js';
import {
  COMMIT_EXPLANATION_PROMPT_VERSION,
  COMMIT_EXPLANATION_SYSTEM_INSTRUCTION,
  buildCommitExplanationPrompt,
} from './commitExplanation.js';
import {
  DIFF_REVIEW_PROMPT_VERSION,
  DIFF_REVIEW_SYSTEM_INSTRUCTION,
  buildDiffReviewPrompt,
} from './diffReview.js';
import {
  BRANCH_ANALYSIS_PROMPT_VERSION,
  BRANCH_ANALYSIS_SYSTEM_INSTRUCTION,
  buildBranchAnalysisPrompt,
} from './branchAnalysis.js';
import {
  REPOSITORY_HEALTH_PROMPT_VERSION,
  REPOSITORY_HEALTH_SYSTEM_INSTRUCTION,
  buildRepositoryHealthPrompt,
} from './repositoryHealth.js';
import {
  REPOSITORY_QA_PROMPT_VERSION,
  REPOSITORY_QA_SYSTEM_INSTRUCTION,
  buildRepositoryQAPrompt,
} from './repositoryQA.js';

export {
  type PromptResult,
  REPOSITORY_OVERVIEW_PROMPT_VERSION,
  REPOSITORY_OVERVIEW_SYSTEM_INSTRUCTION,
  buildRepositoryOverviewPrompt,
  COMMIT_EXPLANATION_PROMPT_VERSION,
  COMMIT_EXPLANATION_SYSTEM_INSTRUCTION,
  buildCommitExplanationPrompt,
  DIFF_REVIEW_PROMPT_VERSION,
  DIFF_REVIEW_SYSTEM_INSTRUCTION,
  buildDiffReviewPrompt,
  BRANCH_ANALYSIS_PROMPT_VERSION,
  BRANCH_ANALYSIS_SYSTEM_INSTRUCTION,
  buildBranchAnalysisPrompt,
  REPOSITORY_HEALTH_PROMPT_VERSION,
  REPOSITORY_HEALTH_SYSTEM_INSTRUCTION,
  buildRepositoryHealthPrompt,
  REPOSITORY_QA_PROMPT_VERSION,
  REPOSITORY_QA_SYSTEM_INSTRUCTION,
  buildRepositoryQAPrompt,
};

/**
 * Resolves the versioned prompt and system instruction for a given AnalysisType.
 */
export function resolvePrompt(
  type: AnalysisType,
  context: Record<string, unknown>,
  customPrompt?: string
): PromptResult {
  switch (type) {
    case 'REPOSITORY_OVERVIEW':
      return buildRepositoryOverviewPrompt(context);
    case 'COMMIT_EXPLANATION':
      return buildCommitExplanationPrompt(context);
    case 'DIFF_REVIEW':
      return buildDiffReviewPrompt(context);
    case 'BRANCH_ANALYSIS':
      return buildBranchAnalysisPrompt(context);
    case 'REPOSITORY_HEALTH':
      return buildRepositoryHealthPrompt(context);
    case 'REPOSITORY_QA':
      return buildRepositoryQAPrompt(context);
    case 'CUSTOM':
      return {
        prompt: customPrompt || JSON.stringify(context, null, 2),
        systemInstruction: 'You are GitExplore AI, an expert Git intelligence assistant.',
        version: '1.0.0',
      };
    default:
      throw new Error(`Unsupported analysis type for prompt generation: ${String(type)}`);
  }
}
