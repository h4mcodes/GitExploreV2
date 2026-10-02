import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import type { Investigation, SavedRepository } from '@prisma/client';

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
    savedRepository: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Investigations Routes', () => {
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

  describe('GET /api/investigations', () => {
    it('returns HTTP 401 when Authorization header is omitted', async () => {
      const response = await request(app).get('/api/investigations');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns HTTP 200 with investigations list for authenticated user', async () => {
      const mockList: Investigation[] = [
        {
          id: 'inv-1',
          userId: userA.userId,
          repositoryId: 'repo-1',
          title: 'Memory leak inspection',
          description: 'Investigating heap profile',
          context: { branch: 'main' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce(mockList);

      const response = await request(app)
        .get('/api/investigations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]?.title).toBe('Memory leak inspection');
    });

    it('filters investigations by repositoryId query parameter', async () => {
      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/investigations?repositoryId=repo-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(prisma.investigation.findMany).toHaveBeenCalledWith({
        where: {
          userId: userA.userId,
          repositoryId: 'repo-1',
        },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('GET /api/investigations/:id', () => {
    it('returns HTTP 200 with investigation details for the owner', async () => {
      const mockInv: Investigation = {
        id: 'inv-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        title: 'Memory leak inspection',
        description: null,
        context: { branch: 'main', commitSha: 'abcdef123' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(mockInv);

      const response = await request(app)
        .get('/api/investigations/inv-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('inv-1');
      expect(response.body.title).toBe('Memory leak inspection');
    });

    it('returns HTTP 404 when investigation ID does not exist', async () => {
      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/investigations/nonexistent-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('INVESTIGATION_NOT_FOUND');
    });

    it('returns HTTP 403 Forbidden when accessing another user investigation', async () => {
      const otherUserInv: Investigation = {
        id: 'inv-other',
        userId: userB.userId, // Owned by Bob
        repositoryId: 'repo-2',
        title: 'Secret Investigation',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(otherUserInv);

      // Alice tries to access Bob's investigation
      const response = await request(app)
        .get('/api/investigations/inv-other')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/investigations', () => {
    it('returns HTTP 201 on successful investigation creation linked to saved repository', async () => {
      // 1. Verify user's saved repository exists
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(mockSavedRepo);

      const mockCreated: Investigation = {
        id: 'inv-new-uuid',
        userId: userA.userId,
        repositoryId: 'repo-1',
        title: 'Branch Divergence Root Cause',
        description: 'Analyzing diverged branches main vs next',
        context: { baseRef: 'main', headRef: 'next' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.create).mockResolvedValueOnce(mockCreated);

      const response = await request(app)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'repo-1',
          title: 'Branch Divergence Root Cause',
          description: 'Analyzing diverged branches main vs next',
          context: { baseRef: 'main', headRef: 'next' },
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Branch Divergence Root Cause');
      expect(prisma.investigation.create).toHaveBeenCalledWith({
        data: {
          userId: userA.userId,
          repositoryId: 'repo-1',
          title: 'Branch Divergence Root Cause',
          description: 'Analyzing diverged branches main vs next',
          context: { baseRef: 'main', headRef: 'next' },
        },
        include: { repository: true },
      });
    });

    it('returns HTTP 404 when referenced repository does not exist in user workspace', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          repositoryId: 'nonexistent-repo-id',
          title: 'Should fail',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('SAVED_REPO_NOT_FOUND');
      expect(prisma.investigation.create).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 Validation Error when title or repositoryId is missing', async () => {
      const response = await request(app)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          description: 'Missing required title and repositoryId',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT & PATCH /api/investigations/:id', () => {
    it('returns HTTP 200 with updated investigation data', async () => {
      const existingInv: Investigation = {
        id: 'inv-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        title: 'Original Title',
        description: 'Original description',
        context: { branch: 'main' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedInv: Investigation = {
        ...existingInv,
        title: 'Updated Investigation Title',
        description: 'Updated summary notes',
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(existingInv);
      vi.mocked(prisma.investigation.update).mockResolvedValueOnce(updatedInv);

      const response = await request(app)
        .put('/api/investigations/inv-1')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Updated Investigation Title',
          description: 'Updated summary notes',
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Investigation Title');
      expect(prisma.investigation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          title: 'Updated Investigation Title',
          description: 'Updated summary notes',
          context: undefined,
        },
        include: { repository: true },
      });
    });

    it('returns HTTP 403 Forbidden when updating another user investigation', async () => {
      const otherUserInv: Investigation = {
        id: 'inv-other',
        userId: userB.userId,
        repositoryId: 'repo-1',
        title: 'Bob investigation',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(otherUserInv);

      const response = await request(app)
        .patch('/api/investigations/inv-other')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Malicious update',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
      expect(prisma.investigation.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/investigations/:id', () => {
    it('returns HTTP 200 when deleting an investigation owned by the caller', async () => {
      const existingInv: Investigation = {
        id: 'inv-1',
        userId: userA.userId,
        repositoryId: 'repo-1',
        title: 'To delete',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(existingInv);
      vi.mocked(prisma.investigation.delete).mockResolvedValueOnce(existingInv);

      const response = await request(app)
        .delete('/api/investigations/inv-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('inv-1');
      expect(prisma.investigation.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });

    it('returns HTTP 404 when investigation ID does not exist', async () => {
      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/investigations/nonexistent-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('INVESTIGATION_NOT_FOUND');
    });

    it('returns HTTP 403 when trying to delete another user investigation', async () => {
      const otherUserInv: Investigation = {
        id: 'inv-other',
        userId: userB.userId,
        repositoryId: 'repo-1',
        title: 'Bob investigation',
        description: null,
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.investigation.findUnique).mockResolvedValueOnce(otherUserInv);

      const response = await request(app)
        .delete('/api/investigations/inv-other')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
      expect(prisma.investigation.delete).not.toHaveBeenCalled();
    });
  });
});
