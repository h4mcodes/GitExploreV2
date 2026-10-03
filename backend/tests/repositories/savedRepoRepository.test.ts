import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findSavedReposByUserId,
  findSavedRepoById,
  createSavedRepo,
  updateSavedRepo,
  deleteSavedRepo,
} from '../../src/repositories/savedRepoRepository.js';
import { prisma } from '../../src/config/database.js';

// Mock the Prisma database client singleton
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    savedRepository: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('savedRepoRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findSavedReposByUserId', () => {
    it('returns all saved repos for a user ordered by savedAt desc', async () => {
      const mockRepos = [
        {
          id: 'repo-1',
          userId: 'user-1',
          owner: 'facebook',
          name: 'react',
          fullName: 'facebook/react',
          description: 'The library for web and native user interfaces',
          language: 'JavaScript',
          stars: 230000,
          forks: 46000,
          defaultBranch: 'main',
          savedAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
        },
        {
          id: 'repo-2',
          userId: 'user-1',
          owner: 'microsoft',
          name: 'typescript',
          fullName: 'microsoft/typescript',
          description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.',
          language: 'TypeScript',
          stars: 100000,
          forks: 12000,
          defaultBranch: 'main',
          savedAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ];

      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce(mockRepos);

      const result = await findSavedReposByUserId('user-1');

      expect(prisma.savedRepository.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { savedAt: 'desc' },
        include: {
          repositoryTags: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toEqual(mockRepos);
    });
  });

  describe('findSavedRepoById', () => {
    it('returns a saved repository by UUID', async () => {
      const mockRepo = {
        id: 'repo-1',
        userId: 'user-1',
        owner: 'torvalds',
        name: 'linux',
        fullName: 'torvalds/linux',
        description: 'Linux kernel source tree',
        language: 'C',
        stars: 180000,
        forks: 54000,
        defaultBranch: 'master',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(mockRepo);

      const result = await findSavedRepoById('repo-1');

      expect(prisma.savedRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'repo-1' },
        include: {
          repositoryTags: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toEqual(mockRepo);
    });

    it('returns null when repo is not found', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(null);

      const result = await findSavedRepoById('nonexistent-repo');

      expect(prisma.savedRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-repo' },
        include: {
          repositoryTags: {
            include: {
              tag: true,
            },
          },
        },
      });
      expect(result).toBeNull();
    });
  });

  describe('createSavedRepo', () => {
    it('creates and returns a new saved repository record', async () => {
      const repoInput = {
        userId: 'user-1',
        owner: 'vercel',
        name: 'next.js',
        fullName: 'vercel/next.js',
        description: 'The React Framework',
        language: 'JavaScript',
        stars: 125000,
        forks: 27000,
        defaultBranch: 'canary',
      };

      const mockCreated = {
        id: 'repo-uuid-3',
        ...repoInput,
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.create).mockResolvedValueOnce(mockCreated);

      const result = await createSavedRepo(repoInput);

      expect(prisma.savedRepository.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          owner: 'vercel',
          name: 'next.js',
          fullName: 'vercel/next.js',
          description: 'The React Framework',
          language: 'JavaScript',
          stars: 125000,
          forks: 27000,
          defaultBranch: 'canary',
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateSavedRepo', () => {
    it('updates specified fields and returns updated record', async () => {
      const updateData = {
        stars: 130000,
        forks: 28000,
      };

      const mockUpdated = {
        id: 'repo-uuid-3',
        userId: 'user-1',
        owner: 'vercel',
        name: 'next.js',
        fullName: 'vercel/next.js',
        description: 'The React Framework',
        language: 'JavaScript',
        stars: 130000,
        forks: 28000,
        defaultBranch: 'canary',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.update).mockResolvedValueOnce(mockUpdated);

      const result = await updateSavedRepo('repo-uuid-3', updateData);

      expect(prisma.savedRepository.update).toHaveBeenCalledWith({
        where: { id: 'repo-uuid-3' },
        data: {
          stars: 130000,
          forks: 28000,
        },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteSavedRepo', () => {
    it('deletes the saved repo and returns the deleted record', async () => {
      const mockDeleted = {
        id: 'repo-uuid-3',
        userId: 'user-1',
        owner: 'vercel',
        name: 'next.js',
        fullName: 'vercel/next.js',
        description: 'The React Framework',
        language: 'JavaScript',
        stars: 130000,
        forks: 28000,
        defaultBranch: 'canary',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.delete).mockResolvedValueOnce(mockDeleted);

      const result = await deleteSavedRepo('repo-uuid-3');

      expect(prisma.savedRepository.delete).toHaveBeenCalledWith({
        where: { id: 'repo-uuid-3' },
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
