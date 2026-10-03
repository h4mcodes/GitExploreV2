import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import {
  findSavedReposByUserId,
  findSavedRepoById,
  findSavedRepoByUserAndFullName,
  createSavedRepo,
  deleteSavedRepo,
} from '../repositories/savedRepoRepository.js';
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../types/api.js';
import type { SavedRepository } from '@prisma/client';

export interface WorkspaceOverviewResponse {
  readonly metrics: {
    readonly savedReposCount: number;
    readonly investigationsCount: number;
    readonly notesCount: number;
    readonly bookmarksCount: number;
  };
  readonly recentSavedRepositories: readonly SavedRepository[];
  readonly recentActivity: readonly {
    readonly type: 'repository_saved' | 'investigation_updated' | 'note_created';
    readonly id: string;
    readonly title: string;
    readonly timestamp: Date;
  }[];
}

/**
 * GET /api/workspace
 * Returns the authenticated user's workspace overview and summary metrics.
 */
export async function getWorkspaceOverview(
  req: Request,
  res: Response<WorkspaceOverviewResponse>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;

    const [
      savedReposCount,
      investigationsCount,
      notesCount,
      bookmarksCount,
      recentSavedRepos,
      recentInvestigations,
    ] = await Promise.all([
      prisma.savedRepository.count({ where: { userId } }),
      prisma.investigation.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.savedRepository.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        take: 5,
      }),
      prisma.investigation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Assemble combined chronological activity feed
    const activityFeed: {
      readonly type: 'repository_saved' | 'investigation_updated' | 'note_created';
      readonly id: string;
      readonly title: string;
      readonly timestamp: Date;
    }[] = [];

    for (const repo of recentSavedRepos) {
      activityFeed.push({
        type: 'repository_saved',
        id: repo.id,
        title: repo.fullName,
        timestamp: repo.savedAt,
      });
    }

    for (const inv of recentInvestigations) {
      activityFeed.push({
        type: 'investigation_updated',
        id: inv.id,
        title: inv.title,
        timestamp: inv.updatedAt,
      });
    }

    activityFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.status(200).json({
      metrics: {
        savedReposCount,
        investigationsCount,
        notesCount,
        bookmarksCount,
      },
      recentSavedRepositories: recentSavedRepos,
      recentActivity: activityFeed.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workspace/repositories
 * Lists all saved repositories for the authenticated user.
 */
export async function getSavedRepositories(
  req: Request,
  res: Response<SavedRepository[]>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const repos = await findSavedReposByUserId(req.user.userId);
    res.status(200).json(repos);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workspace/repositories
 * Saves a repository into the user's workspace.
 */
export async function saveRepository(
  req: Request<
    unknown,
    SavedRepository,
    {
      owner: string;
      name: string;
      fullName?: string;
      description?: string | null;
      language?: string | null;
      stars?: number;
      forks?: number;
      defaultBranch?: string;
    }
  >,
  res: Response<SavedRepository>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const userId = req.user.userId;
    const { owner, name, description, language, stars, forks, defaultBranch } = req.body;
    const fullName = (req.body.fullName || `${owner}/${name}`).trim();

    // Prevent duplicate saves in user's workspace
    const existing = await findSavedRepoByUserAndFullName(userId, fullName);
    if (existing) {
      throw new ConflictError(
        `Repository '${fullName}' is already saved in your workspace.`,
        'SAVED_REPO_ALREADY_EXISTS'
      );
    }

    const saved = await createSavedRepo({
      userId,
      owner: owner.trim(),
      name: name.trim(),
      fullName,
      description: description ?? null,
      language: language ?? null,
      stars: typeof stars === 'number' ? stars : 0,
      forks: typeof forks === 'number' ? forks : 0,
      defaultBranch: defaultBranch || 'main',
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/workspace/repositories/:id
 * Removes a saved repository from the user's workspace.
 */
export async function deleteSavedRepository(
  req: Request<{ id: string }>,
  res: Response<{ message: string; id: string }>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const existing = await findSavedRepoById(id);

    if (!existing) {
      throw new NotFoundError(
        `Saved repository with ID '${id}' was not found.`,
        'SAVED_REPO_NOT_FOUND'
      );
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError(
        'You do not have permission to delete this repository from another workspace.',
        'FORBIDDEN'
      );
    }

    await deleteSavedRepo(id);

    res.status(200).json({
      message: 'Repository successfully removed from workspace.',
      id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workspace/tags
 * Lists all custom tags created by the authenticated user.
 */
export async function listTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { findTagsByUserId } = await import('../repositories/tagRepository.js');
    const tags = await findTagsByUserId(req.user.userId);
    res.status(200).json(tags);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workspace/tags
 * Creates a new tag for the authenticated user.
 */
export async function createTag(
  req: Request<unknown, unknown, { name: string; color?: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestError('Tag name is required.', 'TAG_NAME_REQUIRED');
    }

    const { findTagByName, createTag: dbCreateTag } = await import('../repositories/tagRepository.js');
    const existing = await findTagByName(req.user.userId, name.trim());
    if (existing) {
      throw new ConflictError(`Tag '${name.trim()}' already exists.`, 'TAG_ALREADY_EXISTS');
    }

    const tag = await dbCreateTag({
      userId: req.user.userId,
      name: name.trim(),
      color: color && typeof color === 'string' ? color.trim() : '#3b82f6',
    });

    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/workspace/tags/:id
 * Deletes a tag owned by the authenticated user.
 */
export async function deleteTag(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { findTagById, deleteTag: dbDeleteTag } = await import('../repositories/tagRepository.js');
    const existing = await findTagById(id);

    if (!existing) {
      throw new NotFoundError(`Tag with ID '${id}' was not found.`, 'TAG_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to delete this tag.', 'FORBIDDEN');
    }

    await dbDeleteTag(id);

    res.status(200).json({
      message: 'Tag successfully deleted.',
      id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workspace/repositories/:id/tags
 * Assigns a tag to a saved repository.
 */
export async function assignTagToRepository(
  req: Request<{ id: string }, unknown, { tagId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id: repoId } = req.params;
    const { tagId } = req.body;

    if (!tagId || typeof tagId !== 'string' || tagId.trim().length === 0) {
      throw new BadRequestError('tagId is required.', 'TAG_ID_REQUIRED');
    }

    const repo = await findSavedRepoById(repoId);
    if (!repo) {
      throw new NotFoundError(`Saved repository with ID '${repoId}' was not found.`, 'SAVED_REPO_NOT_FOUND');
    }
    if (repo.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to modify this repository.', 'FORBIDDEN');
    }

    const { findTagById, assignTagToRepo } = await import('../repositories/tagRepository.js');
    const tag = await findTagById(tagId.trim());
    if (!tag) {
      throw new NotFoundError(`Tag with ID '${tagId}' was not found.`, 'TAG_NOT_FOUND');
    }
    if (tag.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to assign another user\'s tag.', 'FORBIDDEN');
    }

    const result = await assignTagToRepo(repoId, tagId.trim());
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/workspace/repositories/:id/tags/:tagId
 * Removes a tag assignment from a saved repository.
 */
export async function removeTagFromRepository(
  req: Request<{ id: string; tagId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    const { id: repoId, tagId } = req.params;

    const repo = await findSavedRepoById(repoId);
    if (!repo) {
      throw new NotFoundError(`Saved repository with ID '${repoId}' was not found.`, 'SAVED_REPO_NOT_FOUND');
    }
    if (repo.userId !== req.user.userId) {
      throw new ForbiddenError('You do not have permission to modify this repository.', 'FORBIDDEN');
    }

    const { removeTagFromRepo } = await import('../repositories/tagRepository.js');
    await removeTagFromRepo(repoId, tagId);

    res.status(200).json({
      message: 'Tag successfully removed from repository.',
      repositoryId: repoId,
      tagId,
    });
  } catch (err) {
    next(err);
  }
}
