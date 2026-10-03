import { Bookmark, TargetType } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateBookmarkInput {
  readonly userId: string;
  readonly repositoryId: string;
  readonly targetType: TargetType;
  readonly targetRef: string;
  readonly label: string;
}

export interface UpdateBookmarkInput {
  readonly targetType?: TargetType;
  readonly targetRef?: string;
  readonly label?: string;
}

export interface BookmarkFilterOptions {
  readonly repositoryId?: string;
  readonly targetType?: TargetType;
  readonly targetRef?: string;
}

/**
 * Retrieves all bookmarks for a given user, with optional filters.
 */
export async function findBookmarksByUserId(
  userId: string,
  filters: BookmarkFilterOptions = {}
): Promise<Bookmark[]> {
  const whereClause: {
    userId: string;
    repositoryId?: string;
    targetType?: TargetType;
    targetRef?: string;
  } = { userId };

  if (filters.repositoryId) {
    whereClause.repositoryId = filters.repositoryId;
  }
  if (filters.targetType) {
    whereClause.targetType = filters.targetType;
  }
  if (filters.targetRef) {
    whereClause.targetRef = filters.targetRef;
  }

  return prisma.bookmark.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      repository: {
        select: {
          id: true,
          owner: true,
          name: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Retrieves a single bookmark by UUID.
 */
export async function findBookmarkById(id: string): Promise<Bookmark | null> {
  return prisma.bookmark.findUnique({
    where: { id },
    include: {
      repository: true,
    },
  });
}

/**
 * Creates a new bookmark record.
 */
export async function createBookmark(data: CreateBookmarkInput): Promise<Bookmark> {
  return prisma.bookmark.create({
    data: {
      userId: data.userId,
      repositoryId: data.repositoryId,
      targetType: data.targetType,
      targetRef: data.targetRef,
      label: data.label,
    },
    include: {
      repository: true,
    },
  });
}

/**
 * Updates an existing bookmark record.
 */
export async function updateBookmark(
  id: string,
  data: UpdateBookmarkInput
): Promise<Bookmark> {
  return prisma.bookmark.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
      ...(data.targetRef !== undefined ? { targetRef: data.targetRef } : {}),
    },
    include: {
      repository: true,
    },
  });
}

/**
 * Deletes a bookmark by its identifier.
 */
export async function deleteBookmark(id: string): Promise<Bookmark> {
  return prisma.bookmark.delete({
    where: { id },
  });
}
