import { Request, Response, NextFunction } from 'express';
import {
  findInvestigationsByUserId,
  findInvestigationsByRepoId,
  findInvestigationById,
  createInvestigation as dbCreateInvestigation,
  updateInvestigation as dbUpdateInvestigation,
  deleteInvestigation as dbDeleteInvestigation,
} from '../repositories/investigationRepository.js';
import { findSavedRepoById } from '../repositories/savedRepoRepository.js';
import { findAIAnalysisById } from '../repositories/aiAnalysisRepository.js';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '../types/api.js';
import type { Investigation, Prisma } from '@prisma/client';

/**
 * GET /api/investigations
 * Lists all investigations for the authenticated user, optionally filtered by repositoryId.
 */
export async function listInvestigations(
  req: Request<unknown, Investigation[], unknown, { repositoryId?: string }>,
  res: Response<Investigation[]>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { repositoryId } = req.query;

    let investigations: Investigation[];
    if (repositoryId) {
      investigations = await findInvestigationsByRepoId(userId, repositoryId);
    } else {
      investigations = await findInvestigationsByUserId(userId);
    }

    res.status(200).json(investigations);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/investigations/:id
 * Retrieves a single investigation by UUID for the authenticated user.
 */
export async function getInvestigation(
  req: Request<{ id: string }>,
  res: Response<Investigation>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const investigation = await findInvestigationById(id);

    if (!investigation) {
      throw new NotFoundError(
        `Investigation with ID '${id}' was not found.`,
        'INVESTIGATION_NOT_FOUND'
      );
    }

    if (investigation.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to view this investigation.',
        'FORBIDDEN'
      );
    }

    res.status(200).json(investigation);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/investigations
 * Creates a new investigation attached to a saved repository in the user's workspace.
 */
export async function createInvestigation(
  req: Request<
    unknown,
    Investigation,
    {
      repositoryId: string;
      title: string;
      description?: string | null;
      context?: Prisma.InputJsonValue;
    }
  >,
  res: Response<Investigation>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { repositoryId, title, description, context } = req.body;

    // Verify repository exists and belongs to the user
    const repo = await findSavedRepoById(repositoryId);
    if (!repo || repo.userId !== userId) {
      throw new NotFoundError(
        `Saved repository with ID '${repositoryId}' was not found in your workspace.`,
        'SAVED_REPO_NOT_FOUND'
      );
    }

    const investigation = await dbCreateInvestigation({
      userId,
      repositoryId,
      title: title.trim(),
      description: description?.trim() ?? null,
      context: context ?? {},
    });

    res.status(201).json(investigation);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/investigations/:id & PATCH /api/investigations/:id
 * Updates an investigation's title, description, or context snapshot.
 */
export async function updateInvestigation(
  req: Request<
    { id: string },
    Investigation,
    {
      title?: string;
      description?: string | null;
      context?: Prisma.InputJsonValue;
    }
  >,
  res: Response<Investigation>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findInvestigationById(id);

    if (!existing) {
      throw new NotFoundError(
        `Investigation with ID '${id}' was not found.`,
        'INVESTIGATION_NOT_FOUND'
      );
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to modify this investigation.',
        'FORBIDDEN'
      );
    }

    const updated = await dbUpdateInvestigation(id, {
      title: req.body.title?.trim(),
      description: req.body.description !== undefined ? req.body.description?.trim() ?? null : undefined,
      context: req.body.context,
    });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/investigations/:id
 * Removes an investigation from the user's workspace.
 */
export async function deleteInvestigation(
  req: Request<{ id: string }>,
  res: Response<{ message: string; id: string }>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findInvestigationById(id);

    if (!existing) {
      throw new NotFoundError(
        `Investigation with ID '${id}' was not found.`,
        'INVESTIGATION_NOT_FOUND'
      );
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to delete this investigation.',
        'FORBIDDEN'
      );
    }

    await dbDeleteInvestigation(id);

    res.status(200).json({
      message: 'Investigation successfully deleted.',
      id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/investigations/:id/analyses
 * Attaches or links an AI analysis report to an existing investigation record.
 */
export async function attachAIAnalysis(
  req: Request<
    { id: string },
    Investigation,
    {
      analysisId?: string;
      type: string;
      title?: string;
      data: unknown;
      summary?: string;
      modelId?: string;
      provider?: string;
      contextHash?: string;
    }
  >,
  res: Response<Investigation>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findInvestigationById(id);

    if (!existing) {
      throw new NotFoundError(
        `Investigation with ID '${id}' was not found.`,
        'INVESTIGATION_NOT_FOUND'
      );
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to modify this investigation.',
        'FORBIDDEN'
      );
    }

    let payloadData = req.body.data;
    let payloadType = req.body.type;
    let payloadModel = req.body.modelId;
    let payloadProvider = req.body.provider;
    let payloadContextHash = req.body.contextHash;

    // If analysisId is given, supplement from database record if available
    if (req.body.analysisId) {
      const dbAnalysis = await findAIAnalysisById(req.body.analysisId);
      if (dbAnalysis) {
        payloadData = payloadData || dbAnalysis.response;
        payloadType = payloadType || dbAnalysis.analysisType;
        payloadModel = payloadModel || dbAnalysis.modelId;
        payloadProvider = payloadProvider || dbAnalysis.provider;
        payloadContextHash = payloadContextHash || dbAnalysis.contextHash;
      }
    }

    const summaryStr =
      req.body.summary?.trim() ||
      (typeof payloadData === 'object' && payloadData !== null && 'summary' in payloadData
        ? String((payloadData as Record<string, unknown>).summary)
        : undefined);

    const analysisEntry = {
      id: req.body.analysisId || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: payloadType,
      title: req.body.title?.trim() || undefined,
      summary: summaryStr,
      data: payloadData,
      modelId: payloadModel,
      provider: payloadProvider,
      contextHash: payloadContextHash,
      createdAt: new Date().toISOString(),
    };

    const existingContext =
      typeof existing.context === 'object' && existing.context !== null && !Array.isArray(existing.context)
        ? (existing.context as Record<string, unknown>)
        : {};

    const existingAnalyses = Array.isArray(existingContext.aiAnalyses)
      ? existingContext.aiAnalyses
      : [];

    const updatedContext: Prisma.InputJsonValue = {
      ...existingContext,
      aiAnalyses: [...existingAnalyses, analysisEntry],
    };

    const updated = await dbUpdateInvestigation(id, {
      context: updatedContext,
    });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/investigations/:id/analyses
 * Retrieves all saved AI analysis records linked to an investigation.
 */
export async function getInvestigationAnalyses(
  req: Request<{ id: string }>,
  res: Response<unknown[]>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findInvestigationById(id);

    if (!existing) {
      throw new NotFoundError(
        `Investigation with ID '${id}' was not found.`,
        'INVESTIGATION_NOT_FOUND'
      );
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to view this investigation.',
        'FORBIDDEN'
      );
    }

    const contextObj =
      typeof existing.context === 'object' && existing.context !== null && !Array.isArray(existing.context)
        ? (existing.context as Record<string, unknown>)
        : {};

    const analyses = Array.isArray(contextObj.aiAnalyses) ? contextObj.aiAnalyses : [];

    res.status(200).json(analyses);
  } catch (err) {
    next(err);
  }
}

