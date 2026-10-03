import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findNotesByUserId,
  findNoteById,
  createNote,
  updateNote,
  deleteNote,
} from '../../src/repositories/noteRepository.js';
import { prisma } from '../../src/config/database.js';
import { TargetType } from '@prisma/client';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('noteRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findNotesByUserId', () => {
    it('queries notes for a user ordered by updatedAt desc with default filters', async () => {
      const mockList = [
        {
          id: 'note-1',
          userId: 'user-1',
          content: 'Important observation about async task scheduling',
          targetType: TargetType.COMMIT,
          targetRef: 'abcdef123456',
          repositoryId: 'repo-1',
          investigationId: 'inv-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          repository: {
            id: 'repo-1',
            owner: 'facebook',
            name: 'react',
            fullName: 'facebook/react',
          },
          investigation: {
            id: 'inv-1',
            title: 'React Concurrent Mode Analysis',
          },
        },
      ];

      vi.mocked(prisma.note.findMany).mockResolvedValueOnce(mockList as any);

      const result = await findNotesByUserId('user-1');

      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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
      expect(result).toEqual(mockList);
    });

    it('queries notes applying repository, investigation, targetType, and targetRef filters', async () => {
      vi.mocked(prisma.note.findMany).mockResolvedValueOnce([]);

      await findNotesByUserId('user-1', {
        repositoryId: 'repo-1',
        investigationId: 'inv-1',
        targetType: TargetType.BRANCH,
        targetRef: 'feature/dark-mode',
      });

      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          repositoryId: 'repo-1',
          investigationId: 'inv-1',
          targetType: TargetType.BRANCH,
          targetRef: 'feature/dark-mode',
        },
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
    });
  });

  describe('findNoteById', () => {
    it('retrieves single note with repository and investigation includes', async () => {
      const mockNote = {
        id: 'note-1',
        userId: 'user-1',
        content: 'Fix race condition here',
        targetType: TargetType.FILE,
        targetRef: 'src/index.ts',
        repositoryId: 'repo-1',
        investigationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        repository: { id: 'repo-1', name: 'react' },
        investigation: null,
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(mockNote as any);

      const result = await findNoteById('note-1');

      expect(prisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        include: {
          repository: true,
          investigation: true,
        },
      });
      expect(result).toEqual(mockNote);
    });
  });

  describe('createNote', () => {
    it('creates a note with valid inputs', async () => {
      const input = {
        userId: 'user-1',
        content: 'Key finding on memory footprint',
        targetType: TargetType.DIFF,
        targetRef: 'v1.0.0...v2.0.0',
        repositoryId: 'repo-1',
        investigationId: 'inv-1',
      };

      const mockCreated = {
        id: 'note-new',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        repository: { id: 'repo-1' },
        investigation: { id: 'inv-1' },
      };

      vi.mocked(prisma.note.create).mockResolvedValueOnce(mockCreated as any);

      const result = await createNote(input);

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          content: 'Key finding on memory footprint',
          targetType: TargetType.DIFF,
          targetRef: 'v1.0.0...v2.0.0',
          repositoryId: 'repo-1',
          investigationId: 'inv-1',
        },
        include: {
          repository: true,
          investigation: true,
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateNote', () => {
    it('updates note content and target fields', async () => {
      const mockUpdated = {
        id: 'note-1',
        userId: 'user-1',
        content: 'Updated content',
        targetType: TargetType.COMMIT,
        targetRef: '1234567890ab',
        repositoryId: null,
        investigationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.update).mockResolvedValueOnce(mockUpdated as any);

      const result = await updateNote('note-1', {
        content: 'Updated content',
        targetRef: '1234567890ab',
      });

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: {
          content: 'Updated content',
          targetRef: '1234567890ab',
        },
        include: {
          repository: true,
          investigation: true,
        },
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteNote', () => {
    it('deletes note by UUID', async () => {
      const mockDeleted = {
        id: 'note-1',
        userId: 'user-1',
        content: 'To be removed',
        targetType: TargetType.REPOSITORY,
        targetRef: 'facebook/react',
        repositoryId: null,
        investigationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.delete).mockResolvedValueOnce(mockDeleted as any);

      const result = await deleteNote('note-1');

      expect(prisma.note.delete).toHaveBeenCalledWith({
        where: { id: 'note-1' },
      });
      expect(result).toEqual(mockDeleted);
    });
  });
});
