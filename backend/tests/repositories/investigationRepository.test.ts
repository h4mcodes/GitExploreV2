import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findInvestigationsByUserId,
  findInvestigationsByRepoId,
  findInvestigationById,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
} from '../../src/repositories/investigationRepository.js';
import { prisma } from '../../src/config/database.js';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    investigation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('investigationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findInvestigationsByUserId', () => {
    it('queries investigations for a user ordered by updatedAt desc', async () => {
      const mockList = [
        {
          id: 'inv-1',
          userId: 'user-1',
          repositoryId: 'repo-1',
          title: 'Memory leak investigation',
          description: 'Investigating heap growth on worker threads',
          context: { branch: 'main', commitSha: 'abcdef123' },
          createdAt: new Date(),
          updatedAt: new Date(),
          repository: {
            id: 'repo-1',
            owner: 'torvalds',
            name: 'linux',
            fullName: 'torvalds/linux',
            language: 'C',
          },
        },
      ];

      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce(mockList as any);

      const result = await findInvestigationsByUserId('user-1');

      expect(prisma.investigation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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
      expect(result).toEqual(mockList);
    });
  });

  describe('findInvestigationsByRepoId', () => {
    it('queries investigations for user and specific repository', async () => {
      const mockList = [
        {
          id: 'inv-2',
          userId: 'user-1',
          repositoryId: 'repo-1',
          title: 'Branch divergence check',
          description: null,
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce(mockList as any);

      const result = await findInvestigationsByRepoId('user-1', 'repo-1');

      expect(prisma.investigation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', repositoryId: 'repo-1' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('findInvestigationById', () => {
    it('queries a single investigation by UUID with repository details', async () => {
      const mockInv = {
        id: 'inv-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        title: 'Memory leak investigation',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        repository: {
          id: 'repo-1',
          owner: 'torvalds',
          name: 'linux',
        },
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(mockInv as any);

      const result = await findInvestigationById('inv-1');

      expect(prisma.investigation.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        include: { repository: true },
      });
      expect(result).toEqual(mockInv);
    });
  });

  describe('createInvestigation', () => {
    it('creates and returns a new investigation record', async () => {
      const input = {
        userId: 'user-1',
        repositoryId: 'repo-1',
        title: 'New Feature Analysis',
        description: 'Analyzing branch diffs',
        context: { branch: 'feat-1' },
      };

      const mockCreated = {
        id: 'inv-new',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.create).mockResolvedValueOnce(mockCreated as any);

      const result = await createInvestigation(input);

      expect(prisma.investigation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          repositoryId: 'repo-1',
          title: 'New Feature Analysis',
          description: 'Analyzing branch diffs',
          context: { branch: 'feat-1' },
        },
        include: { repository: true },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateInvestigation', () => {
    it('updates specified fields and returns the updated record', async () => {
      const updateData = {
        title: 'Updated title',
        description: 'Updated description',
        context: { resolved: true },
      };

      const mockUpdated = {
        id: 'inv-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.update).mockResolvedValueOnce(mockUpdated as any);

      const result = await updateInvestigation('inv-1', updateData);

      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          title: 'Updated title',
          description: 'Updated description',
          context: { resolved: true },
        },
        include: { repository: true },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteInvestigation', () => {
    it('deletes the investigation by UUID', async () => {
      const mockDeleted = {
        id: 'inv-1',
        userId: 'user-1',
        repositoryId: 'repo-1',
        title: 'Deleted investigation',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.delete).mockResolvedValueOnce(mockDeleted as any);

      const result = await deleteInvestigation('inv-1');

      expect(prisma.investigation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
