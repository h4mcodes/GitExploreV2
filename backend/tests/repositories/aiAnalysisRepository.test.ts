import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAIAnalysis,
  findAIAnalysisByContextHash,
  findAIAnalysisById,
  findAIAnalysesByRepoId,
  deleteAIAnalysis,
  deleteExpiredAnalyses,
  toPrismaAnalysisType,
} from '../../src/repositories/aiAnalysisRepository.js';
import { prisma } from '../../src/config/database.js';
import { AnalysisType as PrismaAnalysisType } from '@prisma/client';

// Mock the Prisma database client singleton
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    aIAnalysis: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('aiAnalysisRepository (D6-P5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toPrismaAnalysisType', () => {
    it('maps AI analysis types to Prisma enum correctly', () => {
      expect(toPrismaAnalysisType('REPOSITORY_OVERVIEW')).toBe(PrismaAnalysisType.OVERVIEW);
      expect(toPrismaAnalysisType('COMMIT_EXPLANATION')).toBe(PrismaAnalysisType.COMMIT);
      expect(toPrismaAnalysisType('DIFF_REVIEW')).toBe(PrismaAnalysisType.DIFF);
      expect(toPrismaAnalysisType('BRANCH_ANALYSIS')).toBe(PrismaAnalysisType.BRANCH);
      expect(toPrismaAnalysisType('REPOSITORY_HEALTH')).toBe(PrismaAnalysisType.HEALTH);
      expect(toPrismaAnalysisType('REPOSITORY_QA')).toBe(PrismaAnalysisType.OVERVIEW);
      expect(toPrismaAnalysisType('CUSTOM')).toBe(PrismaAnalysisType.OVERVIEW);
    });
  });

  describe('createAIAnalysis', () => {
    it('creates and persists an AIAnalysis record with correct fields', async () => {
      const mockCreated = {
        id: 'analysis-123',
        repositoryId: 'repo-456',
        analysisType: PrismaAnalysisType.OVERVIEW,
        contextHash: 'hash-abc',
        prompt: 'Overview prompt',
        response: { summary: 'Repo summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        createdAt: new Date('2026-03-01T12:00:00Z'),
        expiresAt: new Date('2026-03-02T12:00:00Z'),
      };

      vi.mocked(prisma.aIAnalysis.create).mockResolvedValueOnce(mockCreated);

      const result = await createAIAnalysis({
        repositoryId: 'repo-456',
        analysisType: 'REPOSITORY_OVERVIEW',
        contextHash: 'hash-abc',
        prompt: 'Overview prompt',
        response: { summary: 'Repo summary' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        expiresAt: new Date('2026-03-02T12:00:00Z'),
      });

      expect(prisma.aIAnalysis.create).toHaveBeenCalledWith({
        data: {
          repositoryId: 'repo-456',
          analysisType: PrismaAnalysisType.OVERVIEW,
          contextHash: 'hash-abc',
          prompt: 'Overview prompt',
          response: { summary: 'Repo summary' },
          provider: 'gemini',
          modelId: 'gemini-1.5-flash',
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          expiresAt: new Date('2026-03-02T12:00:00Z'),
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('findAIAnalysisByContextHash', () => {
    it('returns analysis record when non-expired', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const mockRecord = {
        id: 'analysis-1',
        repositoryId: null,
        analysisType: PrismaAnalysisType.COMMIT,
        contextHash: 'hash-xyz',
        prompt: 'Commit prompt',
        response: { intent: 'FEATURE' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        createdAt: new Date(),
        expiresAt: futureDate,
      };

      vi.mocked(prisma.aIAnalysis.findFirst).mockResolvedValueOnce(mockRecord);

      const result = await findAIAnalysisByContextHash('hash-xyz');
      expect(prisma.aIAnalysis.findFirst).toHaveBeenCalledWith({
        where: { contextHash: 'hash-xyz' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockRecord);
    });

    it('returns null when record has expired', async () => {
      const pastDate = new Date(Date.now() - 10000);
      const mockExpiredRecord = {
        id: 'analysis-expired',
        repositoryId: null,
        analysisType: PrismaAnalysisType.DIFF,
        contextHash: 'hash-expired',
        prompt: 'Diff prompt',
        response: { summary: 'Diff' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        createdAt: new Date(Date.now() - 100000),
        expiresAt: pastDate,
      };

      vi.mocked(prisma.aIAnalysis.findFirst).mockResolvedValueOnce(mockExpiredRecord);

      const result = await findAIAnalysisByContextHash('hash-expired');
      expect(result).toBeNull();
    });

    it('returns null when no record exists', async () => {
      vi.mocked(prisma.aIAnalysis.findFirst).mockResolvedValueOnce(null);

      const result = await findAIAnalysisByContextHash('hash-none');
      expect(result).toBeNull();
    });
  });

  describe('findAIAnalysisById', () => {
    it('returns analysis by primary ID', async () => {
      const mockRecord = {
        id: 'analysis-unique',
        repositoryId: null,
        analysisType: PrismaAnalysisType.BRANCH,
        contextHash: 'hash-branch',
        prompt: 'Branch prompt',
        response: { syncStatus: 'SYNCED' },
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
        createdAt: new Date(),
        expiresAt: null,
      };

      vi.mocked(prisma.aIAnalysis.findUnique).mockResolvedValueOnce(mockRecord);

      const result = await findAIAnalysisById('analysis-unique');
      expect(prisma.aIAnalysis.findUnique).toHaveBeenCalledWith({
        where: { id: 'analysis-unique' },
      });
      expect(result).toEqual(mockRecord);
    });
  });

  describe('findAIAnalysesByRepoId', () => {
    it('returns analyses ordered by createdAt desc', async () => {
      const mockList = [
        {
          id: 'analysis-a',
          repositoryId: 'repo-1',
          analysisType: PrismaAnalysisType.HEALTH,
          contextHash: 'hash-a',
          prompt: 'Health prompt',
          response: { healthGrade: 'A' },
          provider: 'gemini',
          modelId: 'gemini-1.5-flash',
          tokenUsage: {},
          createdAt: new Date(),
          expiresAt: null,
        },
      ];

      vi.mocked(prisma.aIAnalysis.findMany).mockResolvedValueOnce(mockList);

      const result = await findAIAnalysesByRepoId('repo-1');
      expect(prisma.aIAnalysis.findMany).toHaveBeenCalledWith({
        where: { repositoryId: 'repo-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('deleteExpiredAnalyses', () => {
    it('deletes expired analyses using lte timestamp condition', async () => {
      vi.mocked(prisma.aIAnalysis.deleteMany).mockResolvedValueOnce({ count: 5 });

      const testNow = new Date('2026-03-02T15:00:00Z');
      const count = await deleteExpiredAnalyses(testNow);

      expect(prisma.aIAnalysis.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lte: testNow,
          },
        },
      });
      expect(count).toBe(5);
    });
  });
});
