import { Note, TargetType } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateNoteInput {
  readonly userId: string;
  readonly content: string;
  readonly targetType: TargetType;
  readonly targetRef: string;
  readonly repositoryId?: string | null;
  readonly investigationId?: string | null;
}

export interface UpdateNoteInput {
  readonly content?: string;
  readonly targetType?: TargetType;
  readonly targetRef?: string;
  readonly repositoryId?: string | null;
  readonly investigationId?: string | null;
}

export interface NoteFilterOptions {
  readonly repositoryId?: string;
  readonly investigationId?: string;
  readonly targetType?: TargetType;
  readonly targetRef?: string;
}

/**
 * Retrieves all notes for a given user, with optional filters.
 */
export async function findNotesByUserId(
  userId: string,
  filters: NoteFilterOptions = {}
): Promise<Note[]> {
  const whereClause: {
    userId: string;
    repositoryId?: string;
    investigationId?: string;
    targetType?: TargetType;
    targetRef?: string;
  } = { userId };

  if (filters.repositoryId) {
    whereClause.repositoryId = filters.repositoryId;
  }
  if (filters.investigationId) {
    whereClause.investigationId = filters.investigationId;
  }
  if (filters.targetType) {
    whereClause.targetType = filters.targetType;
  }
  if (filters.targetRef) {
    whereClause.targetRef = filters.targetRef;
  }

  return prisma.note.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      repository: {
        select: {
          id: true,
          owner: true,
          name: true,
          fullName: true,
        },
      },
      investigation: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Retrieves a single note by UUID.
 */
export async function findNoteById(id: string): Promise<Note | null> {
  return prisma.note.findUnique({
    where: { id },
    include: {
      repository: true,
      investigation: true,
    },
  });
}

/**
 * Creates a new note record.
 */
export async function createNote(data: CreateNoteInput): Promise<Note> {
  return prisma.note.create({
    data: {
      userId: data.userId,
      content: data.content,
      targetType: data.targetType,
      targetRef: data.targetRef,
      repositoryId: data.repositoryId ?? null,
      investigationId: data.investigationId ?? null,
    },
    include: {
      repository: true,
      investigation: true,
    },
  });
}

/**
 * Updates an existing note record.
 */
export async function updateNote(id: string, data: UpdateNoteInput): Promise<Note> {
  return prisma.note.update({
    where: { id },
    data: {
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
      ...(data.targetRef !== undefined ? { targetRef: data.targetRef } : {}),
      ...(data.repositoryId !== undefined ? { repositoryId: data.repositoryId } : {}),
      ...(data.investigationId !== undefined ? { investigationId: data.investigationId } : {}),
    },
    include: {
      repository: true,
      investigation: true,
    },
  });
}

/**
 * Deletes a note by its identifier.
 */
export async function deleteNote(id: string): Promise<Note> {
  return prisma.note.delete({
    where: { id },
  });
}
