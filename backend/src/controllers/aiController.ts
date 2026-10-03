import { Request, Response, NextFunction } from 'express';
import { getAIProvider, type AIProvider } from '../ai/provider.js';
import { resolvePrompt } from '../ai/prompts/index.js';
import { validateAIResponse, type AnalysisResponseMap } from '../ai/schemas/index.js';
import { withAICache, type WithAICacheResult } from '../ai/cache.js';
import {
  buildAIContext,
  type ContextBuilderInputMap,
} from '../ai/contextBuilder.js';
import type { AnalysisType, TokenUsage } from '../ai/types.js';
import { BadRequestError } from '../types/api.js';

export interface AIAnalysisResponse<T> {
  readonly type: AnalysisType;
  readonly data: T;
  readonly cached: boolean;
  readonly contextHash: string;
  readonly provider: string;
  readonly modelId: string;
  readonly tokenUsage: TokenUsage;
  readonly analysisId?: string;
}

export interface PipelineExecutionOptions<T extends AnalysisType> {
  readonly type: T;
  readonly context?: Record<string, unknown>;
  readonly contextInput?: ContextBuilderInputMap[T];
  readonly customPrompt?: string;
  readonly repositoryId?: string | null;
  readonly bypassCache?: boolean;
  readonly ttlMs?: number;
  readonly providerOverride?: AIProvider;
}

/**
 * Universal AI pipeline orchestrator:
 * Context construction -> Prompt resolution -> AI execution -> Zod validation -> Database caching -> Response.
 */
export async function executeAIPipeline<T extends AnalysisType>(
  options: PipelineExecutionOptions<T>
): Promise<WithAICacheResult<AnalysisResponseMap[T]>> {
  const {
    type,
    context: providedContext,
    contextInput,
    customPrompt,
    repositoryId,
    bypassCache = false,
    ttlMs,
    providerOverride,
  } = options;

  // 1. Build or extract context
  let finalContext: Record<string, unknown>;
  if (providedContext && typeof providedContext === 'object' && Object.keys(providedContext).length > 0) {
    finalContext = providedContext;
  } else if (contextInput) {
    finalContext = buildAIContext(type, contextInput);
  } else {
    throw new BadRequestError(
      `No context or valid input provided for analysis type: ${type}`,
      'MISSING_ANALYSIS_CONTEXT'
    );
  }

  // 2. Resolve versioned prompt and system instructions
  const promptResult = resolvePrompt(type, finalContext, customPrompt);

  // 3. Obtain AI provider
  const provider = providerOverride || getAIProvider();

  // 4. Execute with deterministic database caching
  return withAICache<AnalysisResponseMap[T]>({
    type,
    context: finalContext,
    prompt: promptResult.prompt,
    promptVersion: promptResult.version,
    repositoryId,
    ttlMs,
    bypassCache,
    fetcher: async () => {
      const rawResponse = await provider.analyze({
        type,
        context: finalContext,
        prompt: promptResult.prompt,
        systemInstruction: promptResult.systemInstruction,
      });

      const validatedData = validateAIResponse(type, rawResponse.content);

      return {
        data: validatedData,
        provider: rawResponse.provider,
        modelId: rawResponse.model,
        tokenUsage: rawResponse.tokenUsage,
      };
    },
  });
}

/**
 * GET /api/ai/status
 * Returns current provider readiness and supported analysis capabilities.
 */
export async function getAIStatus(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const provider = getAIProvider();
    const configCheck = provider.validateConfiguration();

    res.status(200).json({
      provider: provider.name,
      model: provider.model,
      available: provider.isAvailable(),
      configured: configCheck.valid,
      configurationReason: configCheck.reason,
      supportedAnalyses: [
        'REPOSITORY_OVERVIEW',
        'COMMIT_EXPLANATION',
        'DIFF_REVIEW',
        'BRANCH_ANALYSIS',
        'REPOSITORY_HEALTH',
        'REPOSITORY_QA',
      ],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/analyze
 * Universal endpoint accepting any supported AnalysisType.
 */
export async function postAnalyze(
  req: Request<
    Record<string, never>,
    AIAnalysisResponse<unknown>,
    {
      type: AnalysisType;
      context?: Record<string, unknown>;
      input?: unknown;
      customPrompt?: string;
      repositoryId?: string;
      bypassCache?: boolean;
      ttlMs?: number;
    }
  >,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { type, context, input, customPrompt, repositoryId, bypassCache, ttlMs } = req.body;

    if (!type) {
      throw new BadRequestError('Analysis type is required', 'MISSING_ANALYSIS_TYPE');
    }

    const result = await executeAIPipeline({
      type,
      context,
      contextInput: input as ContextBuilderInputMap[typeof type],
      customPrompt,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type,
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/repository-overview
 */
export async function postRepositoryOverview(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, repo, statistics, fileAnalysis, evolution, repositoryId, bypassCache, ttlMs } =
      req.body;

    const contextInput =
      repo !== undefined
        ? { repo, statistics, fileAnalysis, evolution }
        : undefined;

    const result = await executeAIPipeline({
      type: 'REPOSITORY_OVERVIEW',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'REPOSITORY_OVERVIEW',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/commit-explanation
 */
export async function postCommitExplanation(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, commit, repositoryCoordinates, parentMessages, repositoryId, bypassCache, ttlMs } =
      req.body;

    const contextInput =
      commit !== undefined
        ? { commit, repositoryCoordinates, parentMessages }
        : undefined;

    const result = await executeAIPipeline({
      type: 'COMMIT_EXPLANATION',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'COMMIT_EXPLANATION',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/diff-review
 */
export async function postDiffReview(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, title, files, baseRef, headRef, repositoryId, bypassCache, ttlMs } = req.body;

    const contextInput =
      files !== undefined
        ? { title: title || 'Diff Review', files, baseRef, headRef }
        : undefined;

    const result = await executeAIPipeline({
      type: 'DIFF_REVIEW',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'DIFF_REVIEW',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/branch-analysis
 */
export async function postBranchAnalysis(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, divergence, comparison, repositoryId, bypassCache, ttlMs } = req.body;

    const contextInput =
      divergence !== undefined ? { divergence, comparison } : undefined;

    const result = await executeAIPipeline({
      type: 'BRANCH_ANALYSIS',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'BRANCH_ANALYSIS',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/repository-health
 */
export async function postRepositoryHealth(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, repo, statistics, evolution, fileAnalysis, repositoryId, bypassCache, ttlMs } =
      req.body;

    const contextInput =
      repo !== undefined && statistics !== undefined && evolution !== undefined
        ? { repo, statistics, evolution, fileAnalysis }
        : undefined;

    const result = await executeAIPipeline({
      type: 'REPOSITORY_HEALTH',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'REPOSITORY_HEALTH',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/qa
 */
export async function postRepositoryQA(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const { context, question, repo, analysis, focusedContext, repositoryId, bypassCache, ttlMs } =
      req.body;

    const contextInput =
      question !== undefined && repo !== undefined
        ? { question, repo, analysis, focusedContext }
        : undefined;

    const result = await executeAIPipeline({
      type: 'REPOSITORY_QA',
      context,
      contextInput,
      repositoryId,
      bypassCache,
      ttlMs,
    });

    res.status(200).json({
      type: 'REPOSITORY_QA',
      data: result.data,
      cached: result.cached,
      contextHash: result.contextHash,
      provider: result.provider,
      modelId: result.modelId,
      tokenUsage: result.tokenUsage,
      analysisId: result.analysisId,
    });
  } catch (err) {
    next(err);
  }
}
