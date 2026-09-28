import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findUserById,
  findUserByGithubId,
  findUserByUsername,
  createUser,
  updateUser,
} from '../../src/repositories/userRepository.js';
import { prisma } from '../../src/config/database.js';

// Mock the Prisma database client singleton
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('userRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findUserById', () => {
    it('returns a user when found by UUID', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        githubId: 'gh-12345',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await findUserById('user-uuid-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('returns null when user is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const result = await findUserById('nonexistent-uuid');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-uuid' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findUserByGithubId', () => {
    it('queries user by githubId', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        githubId: 'gh-12345',
        username: 'testuser',
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await findUserByGithubId('gh-12345');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { githubId: 'gh-12345' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserByUsername', () => {
    it('queries user by unique username', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        githubId: null,
        username: 'torvalds',
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);

      const result = await findUserByUsername('torvalds');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'torvalds' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('creates and returns a new user record', async () => {
      const userInput = {
        username: 'octocat',
        githubId: 'gh-583231',
        email: 'octocat@github.com',
        avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
      };

      const mockCreatedUser = {
        id: 'user-uuid-2',
        ...userInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.create).mockResolvedValueOnce(mockCreatedUser);

      const result = await createUser(userInput);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'octocat',
          githubId: 'gh-583231',
          email: 'octocat@github.com',
          avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
        },
      });
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('updateUser', () => {
    it('updates user fields and returns the updated record', async () => {
      const updateData = {
        email: 'updated@example.com',
        avatarUrl: 'https://new-avatar.png',
      };

      const mockUpdatedUser = {
        id: 'user-uuid-1',
        githubId: 'gh-12345',
        username: 'testuser',
        email: 'updated@example.com',
        avatarUrl: 'https://new-avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.update).mockResolvedValueOnce(mockUpdatedUser);

      const result = await updateUser('user-uuid-1', updateData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: {
          email: 'updated@example.com',
          avatarUrl: 'https://new-avatar.png',
        },
      });
      expect(result).toEqual(mockUpdatedUser);
    });
  });
});
