import { Request, Response, NextFunction } from 'express';
import { getAIProvider, type AIProvider } from '../ai/provider.js';
import { resolvePrompt } from '../ai/prompts/index.js';
import { validateAIResponse, type AnalysisResponseMap } from '../ai/schemas/index.js';
import { withAICache, type WithAICacheResult } from '../ai/cache.js';
import {
  buildAIContext,
  type ContextBuilderInputMap,
  type InvestigationCommitSummary,
} from '../ai/contextBuilder.js';
import type { AnalysisType, TokenUsage } from '../ai/types.js';
import { BadRequestError } from '../types/api.js';
import { githubClient } from '../github/client.js';
import {
  computeCommitStatistics,
  computeRepositoryEvolution,
  computeFileChurn,
  computeDivergence,
  buildCommitRelationshipGraph,
} from '../intelligence/index.js';
import type { GithubApiCommitDetail } from '../github/types.js';

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
    const {
      context,
      repo,
      owner,
      branch,
      statistics: userStatistics,
      fileAnalysis: userFileAnalysis,
      evolution: userEvolution,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let contextInput: ContextBuilderInputMap['REPOSITORY_OVERVIEW'] | undefined;

    if (repo && typeof repo === 'object') {
      contextInput = {
        repo,
        statistics: userStatistics,
        fileAnalysis: userFileAnalysis,
        evolution: userEvolution,
      };
    } else if (typeof owner === 'string' && typeof repo === 'string') {
      // Dynamic repository fetch from GitHub
      const repoMeta = await githubClient.getRepo(owner, repo);
      const targetBranch = branch || repoMeta.default_branch || 'main';

      let stats = userStatistics;
      let evol = userEvolution;
      let churn = userFileAnalysis;

      if (!stats || !evol || !churn) {
        try {
          const commits = await githubClient.getCommits(owner, repo, {
            sha: targetBranch,
            per_page: 50,
          });

          if (commits && commits.length > 0) {
            stats = stats || computeCommitStatistics(commits);
            evol = evol || computeRepositoryEvolution(commits);

            const detailsSettled = await Promise.allSettled(
              commits.slice(0, 10).map((c) => githubClient.getCommit(owner, repo, c.sha))
            );
            const validDetails = detailsSettled
              .filter((d): d is PromiseFulfilledResult<GithubApiCommitDetail> => d.status === 'fulfilled')
              .map((d) => d.value);

            if (validDetails.length > 0) {
              churn = churn || computeFileChurn(validDetails);
            }
          }
        } catch (fetchErr) {
          console.warn('[AI Overview] Could not compute full commit intelligence:', fetchErr);
        }
      }

      contextInput = {
        repo: repoMeta,
        statistics: stats,
        fileAnalysis: churn,
        evolution: evol,
      };
    }

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
    const {
      context,
      commit,
      owner,
      repo,
      sha,
      ref,
      repositoryCoordinates: userRepoCoords,
      parentMessages,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let contextInput: ContextBuilderInputMap['COMMIT_EXPLANATION'] | undefined;

    if (commit !== undefined) {
      contextInput = {
        commit,
        repositoryCoordinates: userRepoCoords || (owner && repo ? { owner, repo } : undefined),
        parentMessages,
      };
    } else if (
      typeof owner === 'string' &&
      typeof repo === 'string' &&
      (typeof sha === 'string' || typeof ref === 'string')
    ) {
      const targetSha = sha || ref;
      const commitDetail = await githubClient.getCommit(owner, repo, targetSha);
      contextInput = {
        commit: commitDetail,
        repositoryCoordinates: { owner, repo },
        parentMessages,
      };
    }

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
    const {
      context,
      title,
      files,
      baseRef,
      headRef,
      owner,
      repo,
      base,
      head,
      sha,
      ref,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let contextInput: ContextBuilderInputMap['DIFF_REVIEW'] | undefined;

    if (files !== undefined && Array.isArray(files)) {
      contextInput = {
        title: title || 'Diff Review',
        files,
        baseRef,
        headRef,
      };
    } else if (typeof owner === 'string' && typeof repo === 'string') {
      const effectiveBase = base || baseRef;
      const effectiveHead = head || headRef;

      if (typeof effectiveBase === 'string' && typeof effectiveHead === 'string') {
        const comparison = await githubClient.compareCommits(owner, repo, effectiveBase, effectiveHead);
        contextInput = {
          title: title || `Comparison: ${effectiveBase}...${effectiveHead}`,
          files: comparison.files || [],
          baseRef: effectiveBase,
          headRef: effectiveHead,
        };
      } else if (typeof sha === 'string' || typeof ref === 'string') {
        const targetRef = sha || ref;
        const commitDetail = await githubClient.getCommit(owner, repo, targetRef);
        contextInput = {
          title: title || `Commit Diff: ${commitDetail.sha?.slice(0, 7) || targetRef}`,
          files: commitDetail.files || [],
          baseRef: commitDetail.parents?.[0]?.sha,
          headRef: commitDetail.sha,
        };
      }
    }

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
    const {
      context,
      divergence: userDivergence,
      comparison: userComparison,
      owner,
      repo,
      base,
      baseRef,
      head,
      headRef,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let contextInput: ContextBuilderInputMap['BRANCH_ANALYSIS'] | undefined;

    if (userDivergence !== undefined) {
      contextInput = {
        divergence: userDivergence,
        comparison: userComparison,
      };
    } else if (typeof owner === 'string' && typeof repo === 'string') {
      const effectiveBase = base || baseRef;
      const effectiveHead = head || headRef;

      if (typeof effectiveBase === 'string' && typeof effectiveHead === 'string') {
        const comparison = await githubClient.compareCommits(owner, repo, effectiveBase, effectiveHead);
        const divergence = computeDivergence(effectiveBase, effectiveHead, comparison);
        contextInput = {
          divergence,
          comparison,
        };
      }
    }

    if (!context && !contextInput) {
      throw new BadRequestError(
        'Either prebuilt context, divergence object, or repository coordinates with base and head branches are required',
        'MISSING_BRANCH_ANALYSIS_INPUT'
      );
    }

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
    const {
      context,
      repo,
      owner,
      branch,
      statistics: userStatistics,
      evolution: userEvolution,
      fileAnalysis: userFileAnalysis,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let contextInput: ContextBuilderInputMap['REPOSITORY_HEALTH'] | undefined;

    if (repo && typeof repo === 'object' && userStatistics && userEvolution) {
      contextInput = {
        repo,
        statistics: userStatistics,
        evolution: userEvolution,
        fileAnalysis: userFileAnalysis,
      };
    } else if (typeof owner === 'string' && typeof repo === 'string') {
      const repoMeta = await githubClient.getRepo(owner, repo);
      const targetBranch = branch || repoMeta.default_branch || 'main';

      let stats = userStatistics;
      let evol = userEvolution;
      let churn = userFileAnalysis;

      if (!stats || !evol || !churn) {
        try {
          const commits = await githubClient.getCommits(owner, repo, {
            sha: targetBranch,
            per_page: 50,
          });

          if (commits && commits.length > 0) {
            stats = stats || computeCommitStatistics(commits);
            evol = evol || computeRepositoryEvolution(commits);

            const detailsSettled = await Promise.allSettled(
              commits.slice(0, 10).map((c) => githubClient.getCommit(owner, repo, c.sha))
            );
            const validDetails = detailsSettled
              .filter((d): d is PromiseFulfilledResult<GithubApiCommitDetail> => d.status === 'fulfilled')
              .map((d) => d.value);

            if (validDetails.length > 0) {
              churn = churn || computeFileChurn(validDetails);
            }
          }
        } catch (fetchErr) {
          console.warn('[AI Health] Could not compute full commit telemetry:', fetchErr);
        }
      }

      if (stats && evol) {
        contextInput = {
          repo: repoMeta,
          statistics: stats,
          evolution: evol,
          fileAnalysis: churn,
        };
      }
    }

    if (!context && !contextInput) {
      throw new BadRequestError(
        'Either prebuilt context, repository objects (repo, statistics, evolution), or repository coordinates (owner, repo) are required',
        'MISSING_REPOSITORY_HEALTH_INPUT'
      );
    }

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
 * Sanitizes user natural language input for repository Q&A:
 * - Ensures input is a valid string
 * - Strips null bytes and ASCII control characters (keeping standard whitespace)
 * - Rejects empty / whitespace-only questions
 * - Caches and caps max length to 500 characters
 */
export function sanitizeUserQuestion(input: unknown): string {
  if (typeof input !== 'string') {
    throw new BadRequestError('Question is required and must be a string', 'INVALID_QUESTION');
  }

  const stripped = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

  if (stripped.length === 0) {
    throw new BadRequestError('Question cannot be empty', 'EMPTY_QUESTION');
  }

  return stripped.slice(0, 500);
}

/**
 * POST /api/ai/repository-qa (and /api/ai/qa)
 */
export async function postRepositoryQA(
  req: Request,
  res: Response<AIAnalysisResponse<unknown>>,
  next: NextFunction
): Promise<void> {
  try {
    const {
      context,
      question: rawQuestion,
      repo,
      owner,
      branch,
      analysis: userAnalysis,
      focusedContext,
      investigation: userInvestigation,
      statistics: userStatistics,
      evolution: userEvolution,
      fileAnalysis: userFileAnalysis,
      divergence: userDivergence,
      repositoryId,
      bypassCache,
      ttlMs,
    } = req.body;

    let question: string | undefined;
    if (rawQuestion !== undefined || !context) {
      question = sanitizeUserQuestion(rawQuestion);
    }

    let contextInput: ContextBuilderInputMap['REPOSITORY_QA'] | undefined;

    if (repo && typeof repo === 'object' && question) {
      contextInput = {
        question,
        repo,
        analysis: userAnalysis || (userStatistics || userEvolution ? {
          statistics: userStatistics,
          evolution: userEvolution,
          fileAnalysis: userFileAnalysis,
          divergence: userDivergence,
        } : undefined),
        focusedContext,
        investigation: userInvestigation || (userStatistics || userEvolution || userFileAnalysis ? {
          repo,
          query: question,
          statistics: userStatistics,
          evolution: userEvolution,
          fileAnalysis: userFileAnalysis,
          divergence: userDivergence,
        } : undefined),
      };
    } else if (typeof owner === 'string' && typeof repo === 'string' && question) {
      const repoMeta = await githubClient.getRepo(owner, repo);
      const targetBranch = branch || repoMeta.default_branch || 'main';

      let stats = userStatistics;
      let evol = userEvolution;
      let churn = userFileAnalysis;
      let graph = userInvestigation?.graph;
      let recentCommitSummaries: InvestigationCommitSummary[] | undefined;

      try {
        const commits = await githubClient.getCommits(owner, repo, {
          sha: targetBranch,
          per_page: 50,
        });

        if (commits && commits.length > 0) {
          stats = stats || computeCommitStatistics(commits);
          evol = evol || computeRepositoryEvolution(commits);
          graph = graph || buildCommitRelationshipGraph(commits);

          recentCommitSummaries = commits.slice(0, 15).map((c) => ({
            sha: c.sha,
            message: c.commit?.message || '',
            authorName: c.commit?.author?.name || 'Unknown',
            authorLogin: c.author?.login || null,
            date: c.commit?.author?.date || '',
            isMerge: (c.parents || []).length > 1,
            parentCount: (c.parents || []).length,
          }));

          if (!churn) {
            const detailsSettled = await Promise.allSettled(
              commits.slice(0, 10).map((c) => githubClient.getCommit(owner, repo, c.sha))
            );
            const validDetails = detailsSettled
              .filter((d): d is PromiseFulfilledResult<GithubApiCommitDetail> => d.status === 'fulfilled')
              .map((d) => d.value);

            if (validDetails.length > 0) {
              churn = computeFileChurn(validDetails);
            }
          }
        }
      } catch (fetchErr) {
        console.warn('[AI QA] Could not compute full telemetry for QA context:', fetchErr);
      }

      contextInput = {
        question,
        repo: repoMeta,
        analysis: userAnalysis || {
          statistics: stats,
          evolution: evol,
          fileAnalysis: churn,
        },
        focusedContext,
        investigation: userInvestigation || {
          repo: repoMeta,
          query: question,
          graph,
          statistics: stats,
          evolution: evol,
          fileAnalysis: churn,
          recentCommits: recentCommitSummaries,
        },
      };
    }

    if (!context && !contextInput) {
      throw new BadRequestError(
        'Either prebuilt context, or repository data (repo object or owner/repo coordinates) with a question are required',
        'MISSING_REPOSITORY_QA_INPUT'
      );
    }

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
