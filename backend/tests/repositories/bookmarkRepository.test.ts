import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findBookmarksByUserId,
  findBookmarkById,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../../src/repositories/bookmarkRepository.js';
import { prisma } from '../../src/config/database.js';
import { TargetType } from '@prisma/client';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    bookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('bookmarkRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findBookmarksByUserId', () => {
    it('queries bookmarks for a user ordered by createdAt desc', async () => {
      const mockList = [
        {
          id: 'bm-1',
          userId: 'user-1',
          repositoryId: 'repo-1',
          targetType: TargetType.COMMIT,
          targetRef: 'abcdef123',
          label: 'Breaking release commit',
          createdAt: new Date(),
          repository: {
            id: 'repo-1',
            owner: 'torvalds',
            name: 'linux',
            fullName: 'torvalds/linux',
          },
        },
      ];

      vi.mocked(prisma.bookmark.findMany).mockResolvedValueOnce(mockList as any);

      const result = await findBookmarksByUserId('user-1');

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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
      expect(result).toEqual(mockList);
    });

    it('queries bookmarks applying repository, targetType, and targetRef filters', async () => {
      vi.mocked(prisma.bookmark.findMany).mockResolvedValueOnce([]);

      await findBookmarksByUserId('user-1', {
        repositoryId: 'repo-1',
        targetType: TargetType.BRANCH,
        targetRef: 'release-2.0',
      });

      expect(prisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          repositoryId: 'repo-1',
          targetType: TargetType.BRANCH,
          targetRef: 'release-2.0',
        },
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
    });
  });

  describe('findBookmarkById', () => {
    it('retrieves single bookmark with repository relation', async () => {
      const mockBookmark = {
        id: 'bm-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        targetType: TargetType.FILE,
        targetRef: 'src/main.rs',
        label: 'Kernel main entrypoint',
        createdAt: new Date(),
        repository: { id: 'repo-1' },
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(mockBookmark as any);

      const result = await findBookmarkById('bm-1');

      expect(prisma.bookmark.findUnique).toHaveBeenCalledWith({
        where: { id: 'bm-1' },
        include: {
          repository: true,
        },
      });
      expect(result).toEqual(mockBookmark);
    });
  });

  describe('createBookmark', () => {
    it('creates bookmark with valid inputs', async () => {
      const input = {
        userId: 'user-1',
        repositoryId: 'repo-1',
        targetType: TargetType.COMPARISON,
        targetRef: 'v1.0.0...v1.1.0',
        label: 'Major performance diff',
      };

      const mockCreated = {
        id: 'bm-new',
        ...input,
        createdAt: new Date(),
        repository: { id: 'repo-1' },
      };

      vi.mocked(prisma.bookmark.create).mockResolvedValueOnce(mockCreated as any);

      const result = await createBookmark(input);

      expect(prisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          repositoryId: 'repo-1',
          targetType: TargetType.COMPARISON,
          targetRef: 'v1.0.0...v1.1.0',
          label: 'Major performance diff',
        },
        include: {
          repository: true,
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateBookmark', () => {
    it('updates bookmark label and target fields', async () => {
      const mockUpdated = {
        id: 'bm-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        targetType: TargetType.COMMIT,
        targetRef: 'abcdef999',
        label: 'Updated bookmark note',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.update).mockResolvedValueOnce(mockUpdated as any);

      const result = await updateBookmark('bm-1', {
        label: 'Updated bookmark note',
        targetRef: 'abcdef999',
      });

      expect(prisma.bookmark.update).toHaveBeenCalledWith({
        where: { id: 'bm-1' },
        data: {
          label: 'Updated bookmark note',
          targetRef: 'abcdef999',
        },
        include: {
          repository: true,
        },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteBookmark', () => {
    it('deletes bookmark by UUID', async () => {
      const mockDeleted = {
        id: 'bm-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        targetType: TargetType.BRANCH,
        targetRef: 'feature/ai',
        label: 'Obsolete branch bookmark',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.delete).mockResolvedValueOnce(mockDeleted as any);

      const result = await deleteBookmark('bm-1');

      expect(prisma.bookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bm-1' },
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
