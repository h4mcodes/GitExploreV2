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
