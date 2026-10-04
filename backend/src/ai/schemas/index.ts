import { z } from 'zod';
import { AIInvalidResponseError, type AnalysisType } from '../types.js';
import {
  RepositoryOverviewResponseSchema,
  type RepositoryOverviewResponse,
} from './repositoryOverview.js';
import {
  CommitExplanationResponseSchema,
  type CommitExplanationResponse,
} from './commitExplanation.js';
import {
  DiffReviewResponseSchema,
  type DiffReviewResponse,
  DiffObservationSchema,
  type DiffObservation,
  DiffObservationSeveritySchema,
  type DiffObservationSeverity,
  DiffObservationCategorySchema,
  type DiffObservationCategory,
  FileDiffReviewSchema,
  type FileDiffReview,
} from './diffReview.js';
import {
  BranchAnalysisResponseSchema,
  type BranchAnalysisResponse,
} from './branchAnalysis.js';
import {
  RepositoryHealthResponseSchema,
  type RepositoryHealthResponse,
} from './repositoryHealth.js';
import {
  RepositoryQAResponseSchema,
  type RepositoryQAResponse,
} from './repositoryQA.js';

export {
  RepositoryOverviewResponseSchema,
  type RepositoryOverviewResponse,
  CommitExplanationResponseSchema,
  type CommitExplanationResponse,
  DiffReviewResponseSchema,
  type DiffReviewResponse,
  DiffObservationSchema,
  type DiffObservation,
  DiffObservationSeveritySchema,
  type DiffObservationSeverity,
  DiffObservationCategorySchema,
  type DiffObservationCategory,
  FileDiffReviewSchema,
  type FileDiffReview,
  BranchAnalysisResponseSchema,
  type BranchAnalysisResponse,
  RepositoryHealthResponseSchema,
  type RepositoryHealthResponse,
  RepositoryQAResponseSchema,
  type RepositoryQAResponse,
};

export type AnalysisResponseMap = {
  REPOSITORY_OVERVIEW: RepositoryOverviewResponse;
  COMMIT_EXPLANATION: CommitExplanationResponse;
  DIFF_REVIEW: DiffReviewResponse;
  BRANCH_ANALYSIS: BranchAnalysisResponse;
  REPOSITORY_HEALTH: RepositoryHealthResponse;
  REPOSITORY_QA: RepositoryQAResponse;
  CUSTOM: Record<string, unknown>;
};

export const AnalysisSchemaMap: Record<Exclude<AnalysisType, 'CUSTOM'>, z.ZodTypeAny> = {
  REPOSITORY_OVERVIEW: RepositoryOverviewResponseSchema,
  COMMIT_EXPLANATION: CommitExplanationResponseSchema,
  DIFF_REVIEW: DiffReviewResponseSchema,
  BRANCH_ANALYSIS: BranchAnalysisResponseSchema,
  REPOSITORY_HEALTH: RepositoryHealthResponseSchema,
  REPOSITORY_QA: RepositoryQAResponseSchema,
};

/**
 * Strips markdown code block wrappers (e.g., ```json ... ```) from LLM output.
 */
export function cleanJsonContent(raw: string): string {
  const trimmed = raw.trim();
  const jsonBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
  const match = jsonBlockRegex.exec(trimmed);
  const captured = match?.[1];
  return captured !== undefined ? captured.trim() : trimmed;
}

/**
 * Validates raw AI output against the corresponding Zod schema for an AnalysisType.
 * Throws AIInvalidResponseError if the output is malformed or violates the schema.
 */
export function validateAIResponse<T extends AnalysisType>(
  type: T,
  rawContent: string | unknown
): AnalysisResponseMap[T] {
  let parsedJson: unknown;

  if (typeof rawContent === 'string') {
    const cleaned = cleanJsonContent(rawContent);
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (err) {
      throw new AIInvalidResponseError(
        `Failed to parse AI response as valid JSON for ${type}`,
        err instanceof Error ? err.message : String(err)
      );
    }
  } else {
    parsedJson = rawContent;
  }

  if (type === 'CUSTOM') {
    if (typeof parsedJson === 'object' && parsedJson !== null) {
      return parsedJson as AnalysisResponseMap[T];
    }
    throw new AIInvalidResponseError('CUSTOM analysis response must be a non-null object');
  }

  const schema = AnalysisSchemaMap[type as Exclude<AnalysisType, 'CUSTOM'>];
  if (!schema) {
    throw new AIInvalidResponseError(`No validation schema registered for analysis type: ${String(type)}`);
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw new AIInvalidResponseError(
      `AI response failed schema validation for ${type}`,
      result.error.format()
    );
  }

  return result.data as AnalysisResponseMap[T];
}
