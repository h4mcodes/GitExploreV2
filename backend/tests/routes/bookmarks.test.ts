import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import { Bookmark, TargetType, SavedRepository } from '@prisma/client';

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
    savedRepository: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Bookmarks Routes', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bookmarks', () => {
    it('returns HTTP 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/bookmarks');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns HTTP 200 with bookmarks list for authenticated user', async () => {
      const mockList: Bookmark[] = [
        {
          id: 'bm-1',
          userId: userA.userId,
          repositoryId: 'repo-1',
          targetType: TargetType.COMMIT,
          targetRef: '9876543210abcdef',
          label: 'Interesting merge commit',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.bookmark.findMany).mockResolvedValueOnce(mockList);

      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]?.label).toBe('Interesting merge commit');
    });

    it('filters bookmarks by repositoryId, targetType, and targetRef', async () => {
      vi.mocked(prisma.bookmark.findMany).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/bookmarks?repositoryId=repo-1&targetType=BRANCH&targetRef=v2.0')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(prisma.bookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId: userA.userId,
          repositoryId: 'repo-1',
          targetType: TargetType.BRANCH,
          targetRef: 'v2.0',
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

    it('returns HTTP 400 for invalid targetType in query', async () => {
      const response = await request(app)
        .get('/api/bookmarks?targetType=BAD_TARGET')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_TYPE');
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    it('returns HTTP 200 with bookmark details for owner', async () => {
      const mockBm: Bookmark = {
        id: 'bm-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.FILE,
        targetRef: 'kernel/sched/core.c',
        label: 'Scheduler Core Entry',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(mockBm);

      const response = await request(app)
        .get('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('bm-1');
      expect(response.body.label).toBe('Scheduler Core Entry');
    });

    it('returns HTTP 404 when bookmark does not exist', async () => {
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/bookmarks/non-existent')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('BOOKMARK_NOT_FOUND');
    });

    it('returns HTTP 403 when bookmark is owned by another user', async () => {
      const mockBm: Bookmark = {
        id: 'bm-1',
        userId: userB.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.COMMIT,
        targetRef: '123456',
        label: 'Bob bookmark',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(mockBm);

      const response = await request(app)
        .get('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/bookmarks', () => {
    it('returns HTTP 201 and creates bookmark with valid input', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(mockSavedRepo);

      const createdBm: Bookmark = {
        id: 'bm-new',
        userId: userA.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.COMPARISON,
        targetRef: 'main...feature/v2',
        label: 'Feature branch compare',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.create).mockResolvedValueOnce(createdBm);

      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-1',
          targetType: 'COMPARISON',
          targetRef: 'main...feature/v2',
          label: 'Feature branch compare',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('bm-new');
      expect(response.body.label).toBe('Feature branch compare');
    });

    it('returns HTTP 400 when missing required label or targetRef', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-1',
          targetType: 'COMMIT',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 400 when targetType is invalid', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-1',
          targetType: 'NON_EXISTENT_TYPE',
          targetRef: 'ref',
          label: 'Label',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_TYPE');
    });

    it('returns HTTP 404 when repositoryId is not in caller workspace', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-outside-workspace',
          targetType: 'COMMIT',
          targetRef: 'abcdef',
          label: 'Bookmark label',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('REPO_NOT_FOUND');
    });
  });

  describe('PATCH /api/bookmarks/:id', () => {
    it('returns HTTP 200 and updates bookmark', async () => {
      const existingBm: Bookmark = {
        id: 'bm-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.BRANCH,
        targetRef: 'main',
        label: 'Old Label',
        createdAt: new Date(),
      };

      const updatedBm: Bookmark = {
        ...existingBm,
        label: 'New Improved Label',
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(existingBm);
      vi.mocked(prisma.bookmark.update).mockResolvedValueOnce(updatedBm);

      const response = await request(app)
        .patch('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          label: 'New Improved Label',
        });

      expect(response.status).toBe(200);
      expect(response.body.label).toBe('New Improved Label');
    });

    it('returns HTTP 403 when modifying another user bookmark', async () => {
      const existingBm: Bookmark = {
        id: 'bm-1',
        userId: userB.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.BRANCH,
        targetRef: 'main',
        label: 'Bob label',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(existingBm);

      const response = await request(app)
        .patch('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          label: 'Hijacked Label',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('returns HTTP 200 and deletes bookmark for owner', async () => {
      const existingBm: Bookmark = {
        id: 'bm-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.COMMIT,
        targetRef: 'abcdef',
        label: 'Bookmark to delete',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(existingBm);
      vi.mocked(prisma.bookmark.delete).mockResolvedValueOnce(existingBm);

      const response = await request(app)
        .delete('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('bm-1');
      expect(response.body.message).toContain('successfully deleted');
    });

    it('returns HTTP 403 when deleting another user bookmark', async () => {
      const existingBm: Bookmark = {
        id: 'bm-1',
        userId: userB.userId,
        repositoryId: 'repo-1',
        targetType: TargetType.COMMIT,
        targetRef: 'abcdef',
        label: 'User B bookmark',
        createdAt: new Date(),
      };

      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(existingBm);

      const response = await request(app)
        .delete('/api/bookmarks/bm-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('returns HTTP 404 when bookmark does not exist', async () => {
      vi.mocked(prisma.bookmark.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/bookmarks/non-existent')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('BOOKMARK_NOT_FOUND');
    });
  });
});
