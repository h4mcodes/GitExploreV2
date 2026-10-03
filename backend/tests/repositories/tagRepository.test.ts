import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findTagsByUserId,
  findTagById,
  findTagByName,
  createTag,
  updateTag,
  deleteTag,
  assignTagToRepo,
  removeTagFromRepo,
  findTagsByRepoId,
} from '../../src/repositories/tagRepository.js';
import { prisma } from '../../src/config/database.js';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    tag: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    repositoryTag: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('tagRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTagsByUserId', () => {
    it('queries tags for a user ordered by name asc', async () => {
      const mockTags = [
        { id: 'tag-1', userId: 'user-1', name: 'Critical', color: '#ef4444', createdAt: new Date() },
        { id: 'tag-2', userId: 'user-1', name: 'Frontend', color: '#3b82f6', createdAt: new Date() },
      ];

      vi.mocked(prisma.tag.findMany).mockResolvedValueOnce(mockTags as any);

      const result = await findTagsByUserId('user-1');

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockTags);
    });
  });

  describe('findTagById', () => {
    it('retrieves single tag by UUID', async () => {
      const mockTag = { id: 'tag-1', userId: 'user-1', name: 'AI', color: '#10b981', createdAt: new Date() };

      vi.mocked(prisma.tag.findUnique).mockResolvedValueOnce(mockTag as any);

      const result = await findTagById('tag-1');

      expect(prisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
      expect(result).toEqual(mockTag);
    });
  });

  describe('findTagByName', () => {
    it('retrieves tag case-insensitively for user', async () => {
      const mockTag = { id: 'tag-1', userId: 'user-1', name: 'Kernel', color: '#f59e0b', createdAt: new Date() };

      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(mockTag as any);

      const result = await findTagByName('user-1', 'kernel');

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          name: {
            equals: 'kernel',
            mode: 'insensitive',
          },
        },
      });
      expect(result).toEqual(mockTag);
    });
  });

  describe('createTag', () => {
    it('creates a tag for user', async () => {
      const input = { userId: 'user-1', name: 'Security', color: '#dc2626' };
      const created = { id: 'tag-new', ...input, createdAt: new Date() };

      vi.mocked(prisma.tag.create).mockResolvedValueOnce(created as any);

      const result = await createTag(input);

      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: input,
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateTag', () => {
    it('updates tag properties', async () => {
      const updated = { id: 'tag-1', userId: 'user-1', name: 'Infra', color: '#6366f1', createdAt: new Date() };

      vi.mocked(prisma.tag.update).mockResolvedValueOnce(updated as any);

      const result = await updateTag('tag-1', { name: 'Infra', color: '#6366f1' });

      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'Infra', color: '#6366f1' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTag', () => {
    it('deletes tag by id', async () => {
      const deleted = { id: 'tag-1', userId: 'user-1', name: 'Old', color: '#888888', createdAt: new Date() };

      vi.mocked(prisma.tag.delete).mockResolvedValueOnce(deleted as any);

      const result = await deleteTag('tag-1');

      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
      expect(result).toEqual(deleted);
    });
  });

  describe('assignTagToRepo & removeTagFromRepo', () => {
    it('upserts repositoryTag relation', async () => {
      const mockResult = {
        repositoryId: 'repo-1',
        tagId: 'tag-1',
        tag: { id: 'tag-1', name: 'Core' },
      };

      vi.mocked(prisma.repositoryTag.upsert).mockResolvedValueOnce(mockResult as any);

      const result = await assignTagToRepo('repo-1', 'tag-1');

      expect(prisma.repositoryTag.upsert).toHaveBeenCalledWith({
        where: {
          repositoryId_tagId: {
            repositoryId: 'repo-1',
            tagId: 'tag-1',
          },
        },
        update: {},
        create: {
          repositoryId: 'repo-1',
          tagId: 'tag-1',
        },
        include: {
          tag: true,
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('removes repositoryTag relation', async () => {
      const mockDeleted = { repositoryId: 'repo-1', tagId: 'tag-1' };

      vi.mocked(prisma.repositoryTag.delete).mockResolvedValueOnce(mockDeleted as any);

      const result = await removeTagFromRepo('repo-1', 'tag-1');

      expect(prisma.repositoryTag.delete).toHaveBeenCalledWith({
        where: {
          repositoryId_tagId: {
            repositoryId: 'repo-1',
            tagId: 'tag-1',
          },
        },
      });
      expect(result).toEqual(mockDeleted);
    });
  });

  describe('findTagsByRepoId', () => {
    it('retrieves and maps tag records for a repository', async () => {
      const mockRepoTags = [
        { repositoryId: 'repo-1', tagId: 'tag-1', tag: { id: 'tag-1', name: 'Auth', color: '#3b82f6' } },
        { repositoryId: 'repo-1', tagId: 'tag-2', tag: { id: 'tag-2', name: 'Database', color: '#10b981' } },
      ];

      vi.mocked(prisma.repositoryTag.findMany).mockResolvedValueOnce(mockRepoTags as any);

      const result = await findTagsByRepoId('repo-1');

      expect(result).toEqual([
        { id: 'tag-1', name: 'Auth', color: '#3b82f6' },
        { id: 'tag-2', name: 'Database', color: '#10b981' },
      ]);
    });
  });
});
