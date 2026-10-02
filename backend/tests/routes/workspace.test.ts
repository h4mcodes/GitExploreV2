import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { generateToken } from '../../src/services/authService.js';
import type { SavedRepository } from '@prisma/client';

// Mock the Prisma database client
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    savedRepository: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    investigation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    note: {
      count: vi.fn(),
    },
    bookmark: {
      count: vi.fn(),
    },
  },
}));

describe('Workspace & Saved Repositories Routes', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workspace (Overview)', () => {
    it('returns HTTP 401 Unauthorized when no authentication token is provided', async () => {
      const response = await request(app).get('/api/workspace');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('returns HTTP 200 with metrics and recent items for authenticated user', async () => {
      vi.mocked(prisma.savedRepository.count).mockResolvedValueOnce(3);
      vi.mocked(prisma.investigation.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.note.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.bookmark.count).mockResolvedValueOnce(8);

      const mockSavedRepos = [
        {
          id: 'repo-1',
          userId: userA.userId,
          owner: 'facebook',
          name: 'react',
          fullName: 'facebook/react',
          description: 'A JS library for building user interfaces',
          language: 'JavaScript',
          stars: 220000,
          forks: 45000,
          defaultBranch: 'main',
          savedAt: new Date('2026-10-01T12:00:00Z'),
          updatedAt: new Date('2026-10-01T12:00:00Z'),
        },
      ];

      const mockInvestigations = [
        {
          id: 'inv-1',
          userId: userA.userId,
          repositoryId: 'repo-1',
          title: 'Analyze React 19 architecture',
          description: null,
          context: {},
          createdAt: new Date('2026-10-02T10:00:00Z'),
          updatedAt: new Date('2026-10-02T11:00:00Z'),
        },
      ];

      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce(mockSavedRepos);
      vi.mocked(prisma.investigation.findMany).mockResolvedValueOnce(mockInvestigations);

      const response = await request(app)
        .get('/api/workspace')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics.savedReposCount).toBe(3);
      expect(response.body.metrics.investigationsCount).toBe(2);
      expect(response.body.metrics.notesCount).toBe(5);
      expect(response.body.metrics.bookmarksCount).toBe(8);
      expect(response.body.recentSavedRepositories).toHaveLength(1);
      expect(response.body.recentActivity).toBeDefined();
      expect(response.body.recentActivity.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/workspace/repositories', () => {
    it('returns HTTP 200 with saved repositories for the authenticated user', async () => {
      const mockRepos: SavedRepository[] = [
        {
          id: 'repo-1',
          userId: userA.userId,
          owner: 'torvalds',
          name: 'linux',
          fullName: 'torvalds/linux',
          description: 'Linux kernel source tree',
          language: 'C',
          stars: 180000,
          forks: 55000,
          defaultBranch: 'master',
          savedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.savedRepository.findMany).mockResolvedValueOnce(mockRepos);

      const response = await request(app)
        .get('/api/workspace/repositories')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        mockRepos.map((r) => ({
          ...r,
          savedAt: r.savedAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }))
      );
      expect(prisma.savedRepository.findMany).toHaveBeenCalledWith({
        where: { userId: userA.userId },
        orderBy: { savedAt: 'desc' },
      });
    });
  });

  describe('POST /api/workspace/repositories', () => {
    it('returns HTTP 201 when saving a new repository', async () => {
      vi.mocked(prisma.savedRepository.findFirst).mockResolvedValueOnce(null); // Not already saved

      const mockSaved: SavedRepository = {
        id: 'repo-uuid-new',
        userId: userA.userId,
        owner: 'vercel',
        name: 'next.js',
        fullName: 'vercel/next.js',
        description: 'The React Framework',
        language: 'JavaScript',
        stars: 125000,
        forks: 26000,
        defaultBranch: 'canary',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.create).mockResolvedValueOnce(mockSaved);

      const response = await request(app)
        .post('/api/workspace/repositories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          owner: 'vercel',
          name: 'next.js',
          description: 'The React Framework',
          language: 'JavaScript',
          stars: 125000,
          forks: 26000,
          defaultBranch: 'canary',
        });

      expect(response.status).toBe(201);
      expect(response.body.fullName).toBe('vercel/next.js');
      expect(prisma.savedRepository.create).toHaveBeenCalledWith({
        data: {
          userId: userA.userId,
          owner: 'vercel',
          name: 'next.js',
          fullName: 'vercel/next.js',
          description: 'The React Framework',
          language: 'JavaScript',
          stars: 125000,
          forks: 26000,
          defaultBranch: 'canary',
        },
      });
    });

    it('returns HTTP 409 Conflict when repository is already saved by user', async () => {
      const existing: SavedRepository = {
        id: 'repo-uuid-existing',
        userId: userA.userId,
        owner: 'vercel',
        name: 'next.js',
        fullName: 'vercel/next.js',
        description: null,
        language: null,
        stars: 0,
        forks: 0,
        defaultBranch: 'canary',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findFirst).mockResolvedValueOnce(existing);

      const response = await request(app)
        .post('/api/workspace/repositories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          owner: 'vercel',
          name: 'next.js',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('SAVED_REPO_ALREADY_EXISTS');
      expect(prisma.savedRepository.create).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 Validation Error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/workspace/repositories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          description: 'Missing owner and name',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/workspace/repositories/:id', () => {
    it('returns HTTP 200 when deleting a saved repository owned by the user', async () => {
      const repoToDelete: SavedRepository = {
        id: 'repo-uuid-123',
        userId: userA.userId,
        owner: 'facebook',
        name: 'react',
        fullName: 'facebook/react',
        description: null,
        language: null,
        stars: 0,
        forks: 0,
        defaultBranch: 'main',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(repoToDelete);
      vi.mocked(prisma.savedRepository.delete).mockResolvedValueOnce(repoToDelete);

      const response = await request(app)
        .delete('/api/workspace/repositories/repo-uuid-123')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('repo-uuid-123');
      expect(prisma.savedRepository.delete).toHaveBeenCalledWith({
        where: { id: 'repo-uuid-123' },
      });
    });

    it('returns HTTP 404 when repository ID does not exist', async () => {
      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/workspace/repositories/nonexistent-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('SAVED_REPO_NOT_FOUND');
    });

    it('returns HTTP 403 Forbidden when trying to delete another user repository', async () => {
      const otherUserRepo: SavedRepository = {
        id: 'repo-uuid-other',
        userId: userB.userId, // Owned by Bob
        owner: 'google',
        name: 'zx',
        fullName: 'google/zx',
        description: null,
        language: null,
        stars: 0,
        forks: 0,
        defaultBranch: 'main',
        savedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.savedRepository.findUnique).mockResolvedValueOnce(otherUserRepo);

      // Alice tries to delete Bob's repo
      const response = await request(app)
        .delete('/api/workspace/repositories/repo-uuid-other')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
      expect(prisma.savedRepository.delete).not.toHaveBeenCalled();
    });
  });
});
