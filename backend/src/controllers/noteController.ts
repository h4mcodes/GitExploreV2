import { Request, Response, NextFunction } from 'express';
import {
  findNotesByUserId,
  findNoteById,
  createNote as dbCreateNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
} from '../repositories/noteRepository.js';
import { findSavedRepoById } from '../repositories/savedRepoRepository.js';
import { findInvestigationById } from '../repositories/investigationRepository.js';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../types/api.js';
import { Note, TargetType } from '@prisma/client';

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
 * GET /api/notes
 * Lists all notes for the authenticated user, optionally filtered by repositoryId, investigationId, targetType, or targetRef.
 */
export async function listNotes(
  req: Request<
    unknown,
    Note[],
    unknown,
    { repositoryId?: string; investigationId?: string; targetType?: string; targetRef?: string }
  >,
  res: Response<Note[]>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { repositoryId, investigationId, targetType: rawTargetType, targetRef } = req.query;

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

    const notes = await findNotesByUserId(userId, {
      repositoryId: repositoryId?.trim(),
      investigationId: investigationId?.trim(),
      targetType,
      targetRef: targetRef?.trim(),
    });

    res.status(200).json(notes);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notes/:id
 * Retrieves a single note by UUID for the authenticated user.
 */
export async function getNote(
  req: Request<{ id: string }>,
  res: Response<Note>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const note = await findNoteById(id);

    if (!note) {
      throw new NotFoundError(`Note with ID '${id}' was not found.`, 'NOTE_NOT_FOUND');
    }

    if (note.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to view this note.', 'FORBIDDEN');
    }

    res.status(200).json(note);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notes
 * Creates a new note attached to a target entity (repository, commit, branch, diff, etc.).
 */
export async function createNote(
  req: Request<
    unknown,
    Note,
    {
      content: string;
      targetType: string;
      targetRef: string;
      repositoryId?: string | null;
      investigationId?: string | null;
    }
  >,
  res: Response<Note>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { content, targetType: rawTargetType, targetRef, repositoryId, investigationId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new BadRequestError('Note content is required.', 'CONTENT_REQUIRED');
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

    // If repositoryId is provided, verify it exists and belongs to the user
    if (repositoryId) {
      const savedRepo = await findSavedRepoById(repositoryId.trim());
      if (!savedRepo || savedRepo.userId !== userId) {
        throw new NotFoundError(
          `Saved repository '${repositoryId}' was not found in your workspace.`,
          'REPO_NOT_FOUND'
        );
      }
    }

    // If investigationId is provided, verify it exists and belongs to the user
    if (investigationId) {
      const investigation = await findInvestigationById(investigationId.trim());
      if (!investigation || investigation.userId !== userId) {
        throw new NotFoundError(
          `Investigation '${investigationId}' was not found in your workspace.`,
          'INVESTIGATION_NOT_FOUND'
        );
      }
    }

    const note = await dbCreateNote({
      userId,
      content: content.trim(),
      targetType,
      targetRef: targetRef.trim(),
      repositoryId: repositoryId ? repositoryId.trim() : null,
      investigationId: investigationId ? investigationId.trim() : null,
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notes/:id
 * Updates an existing note.
 */
export async function updateNote(
  req: Request<
    { id: string },
    Note,
    {
      content?: string;
      targetType?: string;
      targetRef?: string;
      repositoryId?: string | null;
      investigationId?: string | null;
    }
  >,
  res: Response<Note>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findNoteById(id);

    if (!existing) {
      throw new NotFoundError(`Note with ID '${id}' was not found.`, 'NOTE_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to modify this note.', 'FORBIDDEN');
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

    // Check repository ownership if updated
    if (req.body.repositoryId !== undefined && req.body.repositoryId !== null) {
      const savedRepo = await findSavedRepoById(req.body.repositoryId.trim());
      if (!savedRepo || savedRepo.userId !== req.user.userId) {
        throw new NotFoundError(
          `Saved repository '${req.body.repositoryId}' was not found in your workspace.`,
          'REPO_NOT_FOUND'
        );
      }
    }

    // Check investigation ownership if updated
    if (req.body.investigationId !== undefined && req.body.investigationId !== null) {
      const investigation = await findInvestigationById(req.body.investigationId.trim());
      if (!investigation || investigation.userId !== req.user.userId) {
        throw new NotFoundError(
          `Investigation '${req.body.investigationId}' was not found in your workspace.`,
          'INVESTIGATION_NOT_FOUND'
        );
      }
    }

    const updated = await dbUpdateNote(id, {
      content: req.body.content !== undefined ? req.body.content.trim() : undefined,
      targetType,
      targetRef: req.body.targetRef !== undefined ? req.body.targetRef.trim() : undefined,
      repositoryId: req.body.repositoryId !== undefined ? (req.body.repositoryId ? req.body.repositoryId.trim() : null) : undefined,
      investigationId: req.body.investigationId !== undefined ? (req.body.investigationId ? req.body.investigationId.trim() : null) : undefined,
    });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notes/:id
 * Removes a note from the user's workspace.
 */
export async function deleteNote(
  req: Request<{ id: string }>,
  res: Response<{ message: string; id: string }>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findNoteById(id);

    if (!existing) {
      throw new NotFoundError(`Note with ID '${id}' was not found.`, 'NOTE_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to delete this note.', 'FORBIDDEN');
    }

    await dbDeleteNote(id);

    res.status(200).json({
      message: 'Note successfully deleted.',
      id,
    });
  } catch (err) {
    next(err);
  }
}
