import { Request, Response, NextFunction } from 'express';
import {
  findBookmarksByUserId,
  findBookmarkById,
  createBookmark as dbCreateBookmark,
  updateBookmark as dbUpdateBookmark,
  deleteBookmark as dbDeleteBookmark,
} from '../repositories/bookmarkRepository.js';
import { findSavedRepoById } from '../repositories/savedRepoRepository.js';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../types/api.js';
import { Bookmark, TargetType } from '@prisma/client';

const VALID_TARGET_TYPES: Set<string> = new Set([
  'COMMIT',
  'BRANCH',
  'DIFF',
  'REPOSITORY',
  'FILE',
  'COMPARISON',
]);

function parseTargetType(raw: unknown): TargetType | undefined {
  if (typeof raw !== 'string') return undefined;
  const upper = raw.trim().toUpperCase();
  if (VALID_TARGET_TYPES.has(upper)) {
    return upper as TargetType;
  }
  return undefined;
}

/**
 * GET /api/bookmarks
 * Lists all bookmarks for the authenticated user, optionally filtered by repositoryId, targetType, or targetRef.
 */
export async function listBookmarks(
  req: Request<
    unknown,
    Bookmark[],
    unknown,
    { repositoryId?: string; targetType?: string; targetRef?: string }
  >,
  res: Response<Bookmark[]>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { repositoryId, targetType: rawTargetType, targetRef } = req.query;

    let targetType: TargetType | undefined;
    if (rawTargetType) {
      targetType = parseTargetType(rawTargetType);
      if (!targetType) {
        throw new BadRequestError(
          `Invalid targetType '${rawTargetType}'. Valid values are: ${Array.from(VALID_TARGET_TYPES).join(', ')}.`,
          'INVALID_TARGET_TYPE'
        );
      }
    }

    const bookmarks = await findBookmarksByUserId(userId, {
      repositoryId: repositoryId?.trim(),
      targetType,
      targetRef: targetRef?.trim(),
    });

    res.status(200).json(bookmarks);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookmarks/:id
 * Retrieves a single bookmark by UUID for the authenticated user.
 */
export async function getBookmark(
  req: Request<{ id: string }>,
  res: Response<Bookmark>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const bookmark = await findBookmarkById(id);

    if (!bookmark) {
      throw new NotFoundError(`Bookmark with ID '${id}' was not found.`, 'BOOKMARK_NOT_FOUND');
    }

    if (bookmark.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to view this bookmark.', 'FORBIDDEN');
    }

    res.status(200).json(bookmark);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookmarks
 * Creates a new bookmark attached to a saved repository.
 */
export async function createBookmark(
  req: Request<
    unknown,
    Bookmark,
    {
      repositoryId: string;
      targetType: string;
      targetRef: string;
      label: string;
    }
  >,
  res: Response<Bookmark>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { repositoryId, targetType: rawTargetType, targetRef, label } = req.body;

    if (!repositoryId || typeof repositoryId !== 'string' || repositoryId.trim().length === 0) {
      throw new BadRequestError('repositoryId is required.', 'REPO_ID_REQUIRED');
    }

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      throw new BadRequestError('Bookmark label is required.', 'LABEL_REQUIRED');
    }

    if (!targetRef || typeof targetRef !== 'string' || targetRef.trim().length === 0) {
      throw new BadRequestError('targetRef is required.', 'TARGET_REF_REQUIRED');
    }

    const targetType = parseTargetType(rawTargetType);
    if (!targetType) {
      throw new BadRequestError(
        `Invalid targetType '${rawTargetType}'. Valid values are: ${Array.from(VALID_TARGET_TYPES).join(', ')}.`,
        'INVALID_TARGET_TYPE'
      );
    }

    // Verify repository exists and belongs to the user
    const savedRepo = await findSavedRepoById(repositoryId.trim());
    if (!savedRepo || savedRepo.userId !== userId) {
      throw new NotFoundError(
        `Saved repository '${repositoryId}' was not found in your workspace.`,
        'REPO_NOT_FOUND'
      );
    }

    const bookmark = await dbCreateBookmark({
      userId,
      repositoryId: repositoryId.trim(),
      targetType,
      targetRef: targetRef.trim(),
      label: label.trim(),
    });

    res.status(201).json(bookmark);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookmarks/:id
 * Updates an existing bookmark.
 */
export async function updateBookmark(
  req: Request<
    { id: string },
    Bookmark,
    {
      label?: string;
      targetType?: string;
      targetRef?: string;
    }
  >,
  res: Response<Bookmark>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findBookmarkById(id);

    if (!existing) {
      throw new NotFoundError(`Bookmark with ID '${id}' was not found.`, 'BOOKMARK_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to modify this bookmark.', 'FORBIDDEN');
    }

    let targetType: TargetType | undefined;
    if (req.body.targetType !== undefined) {
      targetType = parseTargetType(req.body.targetType);
      if (!targetType) {
        throw new BadRequestError(
          `Invalid targetType '${req.body.targetType}'. Valid values are: ${Array.from(VALID_TARGET_TYPES).join(', ')}.`,
          'INVALID_TARGET_TYPE'
        );
      }
    }

    const updated = await dbUpdateBookmark(id, {
      label: req.body.label !== undefined ? req.body.label.trim() : undefined,
      targetType,
      targetRef: req.body.targetRef !== undefined ? req.body.targetRef.trim() : undefined,
    });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/bookmarks/:id
 * Removes a bookmark from the user's workspace.
 */
export async function deleteBookmark(
  req: Request<{ id: string }>,
  res: Response<{ message: string; id: string }>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findBookmarkById(id);

    if (!existing) {
      throw new NotFoundError(`Bookmark with ID '${id}' was not found.`, 'BOOKMARK_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to delete this bookmark.', 'FORBIDDEN');
    }

    await dbDeleteBookmark(id);

    res.status(200).json({
      message: 'Bookmark successfully deleted.',
      id,
    });
  } catch (err) {
    next(err);
  }
}
