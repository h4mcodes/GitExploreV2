import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import { Note, TargetType, SavedRepository, Investigation } from '@prisma/client';

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
    savedRepository: {
      findUnique: vi.fn(),
    },
    investigation: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Notes Routes', () => {
  const app = createApp();

  const userA = {
    userId: 'user-uuid-1',
    username: 'alice',
    email: 'alice@example.com',
  };
  const tokenA = generateToken(userA);

  const userB = {
    userId: 'user-uuid-2',
    username: 'bob',
    email: 'bob@example.com',
  };
  const tokenB = generateToken(userB);

  const mockSavedRepo: SavedRepository = {
    id: 'repo-1',
    userId: userA.userId,
    owner: 'torvalds',
    name: 'linux',
    fullName: 'torvalds/linux',
    description: 'Linux kernel source',
    language: 'C',
    stars: 180000,
    forks: 55000,
    defaultBranch: 'master',
    savedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvestigation: Investigation = {
    id: 'inv-1',
    userId: userA.userId,
    repositoryId: 'repo-1',
    title: 'Locking issue investigation',
    description: null,
    context: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notes', () => {
    it('returns HTTP 401 when Authorization header is omitted', async () => {
      const response = await request(app).get('/api/notes');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns HTTP 200 with notes list for authenticated user', async () => {
      const mockList: Note[] = [
        {
          id: 'note-1',
          userId: userA.userId,
          repositoryId: 'repo-1',
          investigationId: 'inv-1',
          targetType: TargetType.COMMIT,
          targetRef: '1234567890abcdef',
          content: 'Found memory leak in commit diff',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.note.findMany).mockResolvedValueOnce(mockList);

      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]?.content).toBe('Found memory leak in commit diff');
    });

    it('filters notes by targetType, repositoryId, investigationId, and targetRef', async () => {
      vi.mocked(prisma.note.findMany).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/notes?targetType=BRANCH&repositoryId=repo-1&investigationId=inv-1&targetRef=main')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: userA.userId,
          targetType: TargetType.BRANCH,
          repositoryId: 'repo-1',
          investigationId: 'inv-1',
          targetRef: 'main',
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

    it('returns HTTP 400 for invalid targetType in query', async () => {
      const response = await request(app)
        .get('/api/notes?targetType=INVALID_TYPE')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_TYPE');
    });
  });

  describe('GET /api/notes/:id', () => {
    it('returns HTTP 200 with note detail when caller owns note', async () => {
      const mockNote: Note = {
        id: 'note-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        investigationId: null,
        targetType: TargetType.FILE,
        targetRef: 'fs/inode.c',
        content: 'Lock contention happens in this function',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(mockNote);

      const response = await request(app)
        .get('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('note-1');
      expect(response.body.targetRef).toBe('fs/inode.c');
    });

    it('returns HTTP 404 when note does not exist', async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/notes/non-existent')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOTE_NOT_FOUND');
    });

    it('returns HTTP 403 when note is owned by another user', async () => {
      const mockNote: Note = {
        id: 'note-1',
        userId: userB.userId,
        repositoryId: 'repo-1',
        investigationId: null,
        targetType: TargetType.COMMIT,
        targetRef: 'abcdef',
        content: 'Secret note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(mockNote);

      const response = await request(app)
        .get('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/notes', () => {
    it('returns HTTP 201 and creates note with valid input', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(mockSavedRepo);

      const createdNote: Note = {
        id: 'note-new',
        userId: userA.userId,
        repositoryId: 'repo-1',
        investigationId: null,
        targetType: TargetType.COMMIT,
        targetRef: 'a1b2c3d4e5f6',
        content: 'Regression introduced in this commit',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.create).mockResolvedValueOnce(createdNote);

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-1',
          targetType: 'COMMIT',
          targetRef: 'a1b2c3d4e5f6',
          content: 'Regression introduced in this commit',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('note-new');
      expect(response.body.content).toBe('Regression introduced in this commit');
    });

    it('returns HTTP 400 when missing required content field', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetType: 'COMMIT',
          targetRef: 'a1b2c3d4e5f6',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 400 when targetType is invalid', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetType: 'UNKNOWN_TARGET',
          targetRef: 'a1b2c3d4e5f6',
          content: 'Test content',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_TYPE');
    });

    it('returns HTTP 404 when repositoryId is not in caller workspace', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'non-existent-repo',
          targetType: 'COMMIT',
          targetRef: 'a1b2c3d4e5f6',
          content: 'Note content',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('REPO_NOT_FOUND');
    });

    it('returns HTTP 404 when investigationId is not in caller workspace', async () => {
      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          investigationId: 'non-existent-inv',
          targetType: 'DIFF',
          targetRef: 'v1...v2',
          content: 'Note content',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('INVESTIGATION_NOT_FOUND');
    });
  });

  describe('PATCH /api/notes/:id', () => {
    it('returns HTTP 200 and updates note', async () => {
      const existingNote: Note = {
        id: 'note-1',
        userId: userA.userId,
        repositoryId: null,
        investigationId: null,
        targetType: TargetType.COMMIT,
        targetRef: 'abc1234',
        content: 'Original note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedNote: Note = {
        ...existingNote,
        content: 'Updated note observation',
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(existingNote);
      vi.mocked(prisma.note.update).mockResolvedValueOnce(updatedNote);

      const response = await request(app)
        .patch('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Updated note observation',
        });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated note observation');
    });

    it('returns HTTP 403 when updating another user note', async () => {
      const existingNote: Note = {
        id: 'note-1',
        userId: userB.userId,
        repositoryId: null,
        investigationId: null,
        targetType: TargetType.COMMIT,
        targetRef: 'abc1234',
        content: 'Original note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(existingNote);

      const response = await request(app)
        .patch('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Hacked content',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('returns HTTP 200 and deletes note for owner', async () => {
      const existingNote: Note = {
        id: 'note-1',
        userId: userA.userId,
        repositoryId: null,
        investigationId: null,
        targetType: TargetType.BRANCH,
        targetRef: 'feature/perf',
        content: 'To be removed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(existingNote);
      vi.mocked(prisma.note.delete).mockResolvedValueOnce(existingNote);

      const response = await request(app)
        .delete('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('note-1');
      expect(response.body.message).toContain('successfully deleted');
    });

    it('returns HTTP 403 when deleting another user note', async () => {
      const existingNote: Note = {
        id: 'note-1',
        userId: userB.userId,
        repositoryId: null,
        investigationId: null,
        targetType: TargetType.BRANCH,
        targetRef: 'feature/perf',
        content: 'User B note',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(existingNote);

      const response = await request(app)
        .delete('/api/notes/note-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('returns HTTP 404 when note does not exist', async () => {
      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/notes/unknown-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOTE_NOT_FOUND');
    });
  });
});
