import { Tag, RepositoryTag } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateTagInput {
  readonly userId: string;
  readonly name: string;
  readonly color: string;
}

export interface UpdateTagInput {
  readonly name?: string;
  readonly color?: string;
}

/**
 * Retrieves all tags defined by a given user.
 */
export async function findTagsByUserId(userId: string): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Retrieves a single tag by UUID.
 */
export async function findTagById(id: string): Promise<Tag | null> {
  return prisma.tag.findUnique({
    where: { id },
  });
}

/**
 * Retrieves a tag by name for a given user.
 */
export async function findTagByName(userId: string, name: string): Promise<Tag | null> {
  return prisma.tag.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * Creates a new tag for the given user.
 */
export async function createTag(data: CreateTagInput): Promise<Tag> {
  return prisma.tag.create({
    data: {
      userId: data.userId,
      name: data.name,
      color: data.color,
    },
  });
}

/**
 * Updates an existing tag.
 */
export async function updateTag(id: string, data: UpdateTagInput): Promise<Tag> {
  return prisma.tag.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
  });
}

/**
 * Deletes a tag by UUID.
 */
export async function deleteTag(id: string): Promise<Tag> {
  return prisma.tag.delete({
    where: { id },
  });
}

/**
 * Associates a tag with a saved repository.
 */
export async function assignTagToRepo(
  repositoryId: string,
  tagId: string
): Promise<RepositoryTag> {
  return prisma.repositoryTag.upsert({
    where: {
      repositoryId_tagId: {
        repositoryId,
        tagId,
      },
    },
    update: {},
    create: {
      repositoryId,
      tagId,
    },
    include: {
      tag: true,
    },
  });
}

/**
 * Removes a tag association from a saved repository.
 */
export async function removeTagFromRepo(
  repositoryId: string,
  tagId: string
): Promise<RepositoryTag> {
  return prisma.repositoryTag.delete({
    where: {
      repositoryId_tagId: {
        repositoryId,
        tagId,
      },
    },
  });
}

/**
 * Retrieves all tags attached to a specific saved repository.
 */
export async function findTagsByRepoId(repositoryId: string): Promise<Tag[]> {
  const repositoryTags = await prisma.repositoryTag.findMany({
    where: { repositoryId },
    include: { tag: true },
    orderBy: { tag: { name: 'asc' } },
  });

  return repositoryTags.map((rt) => rt.tag);
}
