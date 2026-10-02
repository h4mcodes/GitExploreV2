import { Investigation, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateInvestigationInput {
  readonly userId: string;
  readonly repositoryId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly context?: Prisma.InputJsonValue;
}

export interface UpdateInvestigationInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly context?: Prisma.InputJsonValue;
}

/**
 * Retrieves all investigations for a given user.
 */
export async function findInvestigationsByUserId(userId: string): Promise<Investigation[]> {
  return prisma.investigation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      repository: {
        select: {
          id: true,
          owner: true,
          name: true,
          fullName: true,
          language: true,
        },
      },
    },
  });
}

/**
 * Retrieves investigations for a specific user and repository.
 */
export async function findInvestigationsByRepoId(
  userId: string,
  repositoryId: string
): Promise<Investigation[]> {
  return prisma.investigation.findMany({
    where: {
      userId,
      repositoryId,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Retrieves a single investigation by UUID with associated repository.
 */
export async function findInvestigationById(id: string): Promise<Investigation | null> {
  return prisma.investigation.findUnique({
    where: { id },
    include: {
      repository: true,
    },
  });
}

/**
 * Creates a new investigation record.
 */
export async function createInvestigation(
  data: CreateInvestigationInput
): Promise<Investigation> {
  return prisma.investigation.create({
    data: {
      userId: data.userId,
      repositoryId: data.repositoryId,
      title: data.title,
      description: data.description ?? undefined,
      context: data.context ?? {},
    },
    include: {
      repository: true,
    },
  });
}

/**
 * Updates an existing investigation record.
 */
export async function updateInvestigation(
  id: string,
  data: UpdateInvestigationInput
): Promise<Investigation> {
  return prisma.investigation.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.context !== undefined ? { context: data.context } : {}),
    },
    include: {
      repository: true,
    },
  });
}

/**
 * Deletes an investigation record by UUID.
 */
export async function deleteInvestigation(id: string): Promise<Investigation> {
  return prisma.investigation.delete({
    where: { id },
  });
}
