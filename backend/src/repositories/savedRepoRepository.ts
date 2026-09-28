import { SavedRepository } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateSavedRepoInput {
  readonly userId: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly description?: string | null;
  readonly language?: string | null;
  readonly stars?: number;
  readonly forks?: number;
  readonly defaultBranch?: string;
}

export interface UpdateSavedRepoInput {
  readonly description?: string | null;
  readonly language?: string | null;
  readonly stars?: number;
  readonly forks?: number;
  readonly defaultBranch?: string;
}

/**
 * Retrieves all saved repositories associated with a given user UUID.
 */
export async function findSavedReposByUserId(userId: string): Promise<SavedRepository[]> {
  return prisma.savedRepository.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
  });
}

/**
 * Retrieves a saved repository by its unique primary key UUID.
 */
export async function findSavedRepoById(id: string): Promise<SavedRepository | null> {
  return prisma.savedRepository.findUnique({
    where: { id },
  });
}

/**
 * Creates a new saved repository record.
 */
export async function createSavedRepo(data: CreateSavedRepoInput): Promise<SavedRepository> {
  return prisma.savedRepository.create({
    data: {
      userId: data.userId,
      owner: data.owner,
      name: data.name,
      fullName: data.fullName,
      description: data.description ?? undefined,
      language: data.language ?? undefined,
      stars: data.stars ?? 0,
      forks: data.forks ?? 0,
      defaultBranch: data.defaultBranch ?? 'main',
    },
  });
}

/**
 * Updates an existing saved repository record.
 */
export async function updateSavedRepo(
  id: string,
  data: UpdateSavedRepoInput
): Promise<SavedRepository> {
  return prisma.savedRepository.update({
    where: { id },
    data: {
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.stars !== undefined ? { stars: data.stars } : {}),
      ...(data.forks !== undefined ? { forks: data.forks } : {}),
      ...(data.defaultBranch !== undefined ? { defaultBranch: data.defaultBranch } : {}),
    },
  });
}

/**
 * Deletes a saved repository record by its UUID.
 */
export async function deleteSavedRepo(id: string): Promise<SavedRepository> {
  return prisma.savedRepository.delete({
    where: { id },
  });
}
